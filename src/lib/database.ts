import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { GENESIS_MANDATE, HOLDERS, INITIAL_BALANCE, SCENARIOS, SNAPSHOT_AT } from "./scenarios";
import { validateMandate } from "./policy";
import { reconcile } from "./accounting";
import { walletConfigured } from "./near-governance";
import type { AuditEvent, BenchmarkRow, DashboardData, Evaluation, GovernanceProposal, Mandate, Holder, TokenSnapshot } from "./types";

let connection: DatabaseSync | undefined;
export function db() {
  if (connection) return connection;
  const path = resolve(process.env.GREED_DB_PATH || "./data/greed.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  connection = new DatabaseSync(path);
  connection.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  connection.exec(`
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ledger (id TEXT PRIMARY KEY, run_id TEXT UNIQUE REFERENCES runs(id), delta_micros INTEGER NOT NULL, receipt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS executed (proposal_id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id));
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, time INTEGER NOT NULL, type TEXT NOT NULL, subject TEXT NOT NULL, detail TEXT NOT NULL, evidence TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS governance (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ballots (proposal_id TEXT REFERENCES governance(id), holder_id TEXT NOT NULL, choice TEXT NOT NULL CHECK(choice IN ('for','against')), weight INTEGER NOT NULL, PRIMARY KEY(proposal_id, holder_id));
    CREATE INDEX IF NOT EXISTS events_type_idx ON events(type);
    CREATE TABLE IF NOT EXISTS wallet_challenges (id TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wallet_sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, public_key TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS wallet_holders (account_id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wallet_weights (proposal_id TEXT REFERENCES governance(id), account_id TEXT NOT NULL, raw_balance TEXT NOT NULL, block_hash TEXT NOT NULL, PRIMARY KEY(proposal_id, account_id));
    INSERT OR IGNORE INTO migrations VALUES (1, unixepoch() * 1000);
  `);
  if (!connection.prepare("SELECT value FROM meta WHERE key = 'mandate'").get()) {
    transaction(() => {
      setMeta("mandate", GENESIS_MANDATE);
      setMeta("session-secret", randomBytes(48).toString("hex"));
      setMeta("benchmarks", []);
      appendEvent("treasury", "Synthetic genesis", "100,000 simulated USDC seeded as treasury principal. No blockchain funds.", { principalMicros: INITIAL_BALANCE, snapshotAt: SNAPSHOT_AT });
    });
  }
  return connection;
}
export function transaction<T>(fn: () => T): T {
  const conn = db(); conn.exec("BEGIN IMMEDIATE");
  try { const result = fn(); conn.exec("COMMIT"); return result; } catch (error) { conn.exec("ROLLBACK"); throw error; }
}
export function getMeta<T>(key: string): T {
  const row = db().prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) throw new Error(`Missing database value: ${key}`);
  return JSON.parse(row.value);
}
export function walletHolder(accountId: string): Holder | null {
  const row = db().prepare("SELECT payload FROM wallet_holders WHERE account_id=?").get(accountId) as {payload:string}|undefined;
  return row ? JSON.parse(row.payload) : null;
}
export function storeWalletHolder(holder: Holder) {
  db().prepare("INSERT INTO wallet_holders VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET payload=excluded.payload").run(holder.id.slice(5),JSON.stringify(holder));
}
export function setMeta(key: string, value: unknown) {
  db().prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, JSON.stringify(value));
}
export function currentBalance() {
  const row = db().prepare("SELECT COALESCE(SUM(delta_micros),0) AS delta FROM ledger").get() as { delta: number };
  return INITIAL_BALANCE + row.delta;
}
function hashEvent(event: Omit<AuditEvent, "id" | "hash">) { return createHash("sha256").update(JSON.stringify(event)).digest("hex"); }
export function appendEvent(type: string, subject: string, detail: string, evidence: unknown) {
  const last = db().prepare("SELECT hash FROM events ORDER BY id DESC LIMIT 1").get() as { hash: string } | undefined;
  const event = { time: Date.now(), type, subject, detail, evidence, previousHash: last?.hash || "genesis" };
  db().prepare("INSERT INTO events (time,type,subject,detail,evidence,previous_hash,hash) VALUES (?,?,?,?,?,?,?)").run(event.time, type, subject, detail, JSON.stringify(evidence), event.previousHash, hashEvent(event));
}
export function events(): AuditEvent[] {
  const rows = db().prepare("SELECT * FROM events ORDER BY id DESC").all() as { id: number; time: number; type: string; subject: string; detail: string; evidence: string; previous_hash: string; hash: string }[];
  return rows.map(r => ({ id: r.id, time: r.time, type: r.type, subject: r.subject, detail: r.detail, evidence: JSON.parse(r.evidence), previousHash: r.previous_hash, hash: r.hash }));
}
export function verifyAudit(log = events()) {
  let previous = "genesis";
  for (const event of [...log].reverse()) {
    const { id: _id, hash, ...data } = event;
    if (event.previousHash !== previous || hashEvent(data) !== hash) return false;
    previous = hash;
  }
  return true;
}
export function findRun(requestKey: string): Evaluation | null {
  const row = db().prepare("SELECT payload FROM runs WHERE request_key=?").get(requestKey) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : null;
}
export function saveRun(run: Evaluation, requestKey: string, expectedBalance: number): Evaluation {
  return transaction(() => {
    const existing = findRun(requestKey); if (existing) return existing;
    const active = getMeta<Mandate>("mandate");
    if (JSON.stringify(active) !== JSON.stringify(run.mandate) || expectedBalance !== currentBalance()) throw new Error("Treasury or mandate changed during evaluation. Run the scenario again.");
    if (!reconcile(run.receipt)) throw new Error("Receipt does not reconcile.");
    if (currentBalance() + run.receipt.netMicros < 0) throw new Error("Insufficient reserve to cover this evaluation.");
    db().prepare("INSERT INTO runs VALUES (?,?,?,?)").run(run.id, requestKey, run.createdAt, JSON.stringify(run));
    db().prepare("INSERT INTO ledger VALUES (?,?,?,?)").run(run.receipt.id, run.id, run.receipt.netMicros, JSON.stringify(run.receipt));
    if (run.policy.allowed && run.selected.venue !== "hold") db().prepare("INSERT INTO executed VALUES (?,?)").run(run.selected.id, run.id);
    for (const agent of run.agents) appendEvent("agent", agent.name, agent.reasoning, { runId: run.id, ...agent });
    appendEvent("policy", run.selected.agent, run.policy.allowed ? "All eight hard policy checks passed." : "Execution rejected by deterministic policy.", { runId: run.id, proposal: run.selected, ...run.policy });
    appendEvent("receipt", run.scenarioName, `Closed synthetic evaluation: ${run.receipt.netMicros / 1e6} USDC net after costs.`, { runId: run.id, ...run.receipt });
    return run;
  });
}
export function governanceProposals(): GovernanceProposal[] {
  const rows = db().prepare("SELECT payload FROM governance ORDER BY rowid DESC").all() as { payload: string }[];
  return rows.map(r => {
    const proposal: GovernanceProposal = JSON.parse(r.payload);
    const votes = db().prepare("SELECT holder_id AS holderId, choice, weight FROM ballots WHERE proposal_id=?").all(proposal.id) as GovernanceProposal["votes"];
    proposal.votes = votes.map(vote => {
      const raw=proposal.snapshot?db().prepare("SELECT raw_balance FROM wallet_weights WHERE proposal_id=? AND account_id=?").get(proposal.id,vote.holderId.slice(5)) as {raw_balance:string}|undefined:undefined;
      return { holderId: vote.holderId, choice: vote.choice, weight: vote.weight, ...(raw?{rawBalance:raw.raw_balance}:{}) };
    });
    return proposal;
  });
}
function putGovernance(p: GovernanceProposal) { db().prepare("INSERT INTO governance VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(p.id, JSON.stringify({ ...p, votes: [] })); }
export function createGovernance(title: string, description: string, change: GovernanceProposal["change"], holderId: string, now = Date.now(), snapshot?: TokenSnapshot) {
  validateMandate(change);
  if(holderId.startsWith("near:") && !snapshot) throw new Error("Wallet proposals require a verified token snapshot.");
  if(!holderId.startsWith("near:") && snapshot) throw new Error("Demo identities cannot create wallet proposals.");
  if(holderId.startsWith("near:")?!walletHolder(holderId.slice(5)):!HOLDERS.some(h=>h.id===holderId))throw new Error("Unknown governance holder.");
  return transaction(() => {
    const proposal: GovernanceProposal = { id: randomUUID(), title, description, change, createdAt: now, deadline: now + (snapshot?300_000:20_000), executeAfter: null, status: "open", votes: [], ...(snapshot?{snapshot}:{}) };
    putGovernance(proposal);
    appendEvent("governance", title, snapshot?"Five-minute wallet voting window opened at a finalized token snapshot. Treasury settlement remains simulated.":"20-second simulated voting window opened. Snapshot balances determine weight; roles add no weight.", { proposal, holderId, snapshotAt: snapshot?.timestamp||SNAPSHOT_AT });
    return proposal;
  });
}
export function vote(proposalId: string, holderId: string, choice: "for" | "against", now = Date.now(), verifiedWeight?: {rawBalance:string;blockHash:string}) {
  return transaction(() => {
    const proposal = governanceProposals().find(p => p.id === proposalId);
    if (!proposal || proposal.status !== "open" || proposal.deadline <= now) throw new Error("Voting is closed for this proposal.");
    const holder = proposal.snapshot ? walletHolder(holderId.slice(5)) : HOLDERS.find(h => h.id === holderId);
    if(proposal.snapshot){
      if(!holderId.startsWith("near:")||!verifiedWeight||verifiedWeight.blockHash!==proposal.snapshot.blockHash||!/^[1-9]\d*$/.test(verifiedWeight.rawBalance)||BigInt(verifiedWeight.rawBalance)>BigInt(proposal.snapshot.totalSupply)) throw new Error("Wallet vote requires a positive balance verified at the proposal snapshot.");
    }else if(holderId.startsWith("near:")||verifiedWeight)throw new Error("Wallet sessions cannot vote in demo proposals.");
    if (!holder) throw new Error("Holder is not eligible at the snapshot.");
    if (proposal.votes.some(v => v.holderId === holderId)) throw new Error("This snapshot holder has already voted.");
    const weight=verifiedWeight?Number(verifiedWeight.rawBalance)/10**proposal.snapshot!.decimals:holder.balance;
    if(verifiedWeight)db().prepare("INSERT INTO wallet_weights VALUES (?,?,?,?)").run(proposalId,holderId.slice(5),verifiedWeight.rawBalance,verifiedWeight.blockHash);
    db().prepare("INSERT INTO ballots VALUES (?,?,?,?)").run(proposalId, holderId, choice, weight);
    appendEvent("governance", holder.name, `${choice === "for" ? "For" : "Against"}: ${weight.toLocaleString()} $GREED voting weight.`, { proposalId, holderId, choice, weight, ...verifiedWeight });
  });
}
export function finalizeGovernance(proposalId: string, now = Date.now()) {
  return transaction(() => {
    const p = governanceProposals().find(p => p.id === proposalId);
    if (!p || p.status !== "open") throw new Error("Only an open proposal can be finalized.");
    if (p.deadline > now) throw new Error("Wait for the voting window to close.");
    const rawVotes=p.snapshot?p.votes.map(v=>{const row=db().prepare("SELECT raw_balance FROM wallet_weights WHERE proposal_id=? AND account_id=?").get(p.id,v.holderId.slice(5)) as {raw_balance:string}|undefined;if(!row)throw new Error("Missing verified snapshot weight.");return {...v,raw:BigInt(row.raw_balance)};}):p.votes.map(v=>({...v,raw:BigInt(v.weight)}));
    const total = rawVotes.reduce((n,v)=>n+v.raw,0n);
    const support = rawVotes.filter(v=>v.choice==="for").reduce((n,v)=>n+v.raw,0n);
    const eligible = p.snapshot?BigInt(p.snapshot.totalSupply):BigInt(HOLDERS.reduce((n,h)=>n+h.balance,0));
    if(total>eligible)throw new Error("Recorded vote weight exceeds the snapshot supply.");
    p.status = total * 2n >= eligible && support * 2n > total ? "timelock" : "rejected";
    p.executeAfter = p.status === "timelock" ? now + (p.snapshot?60_000:10_000) : null;
    putGovernance(p); appendEvent("governance", p.title, p.status === "timelock" ? `Quorum and majority passed. ${p.snapshot?60:10}-second timelock started.` : "Rejected: quorum or majority not reached.", { proposalId, total:total.toString(), support:support.toString(), eligible:eligible.toString(), executeAfter: p.executeAfter });
  });
}
export function executeGovernance(proposalId: string, now = Date.now()) {
  return transaction(() => {
    const p = governanceProposals().find(p => p.id === proposalId);
    if (!p || p.status !== "timelock" || !p.executeAfter || p.executeAfter > now) throw new Error("Proposal must pass its timelock before execution.");
    validateMandate(p.change);
    const mandate = getMeta<Mandate>("mandate");
    setMeta("mandate", { ...mandate, ...p.change, id: `mandate-${p.id}`, name: p.title });
    p.status = "executed"; putGovernance(p);
    appendEvent("governance", p.title, "Bounded mandate executed. Immutable safety ceilings remain enforced.", { proposalId, change: p.change });
  });
}
export function setPause(paused: boolean, holderId: string) {
  const allowed=holderId.startsWith("near:")?holderId===`near:${process.env.NEAR_GUARDIAN_ACCOUNT}`:HOLDERS.find(h=>h.id===holderId)?.role==="Guardian";
  if (!allowed) throw new Error("Only the configured Guardian can pause or resume the treasury.");
  transaction(() => { const mandate = getMeta<Mandate>("mandate"); setMeta("mandate", { ...mandate, paused }); appendEvent("policy", "Guardian", paused ? "Emergency pause activated." : "Emergency pause released.", { holderId, paused }); });
}
export function saveBenchmark(rows: BenchmarkRow[]) {
  transaction(() => { setMeta("benchmarks", rows); appendEvent("benchmark", "Fixed six-scenario dataset", "Swarm, single scout and no-trade evaluated with identical starting capital and mandate. Benchmark runs do not change treasury balance.", rows.map(r => ({ scenario: r.scenarioId, swarm: r.swarm.receipt, single: r.single.receipt, noTrade: r.noTrade.receipt }))); });
}
export function dashboard(holderId: string | null): DashboardData {
  const rows = db().prepare("SELECT payload FROM runs ORDER BY created_at DESC LIMIT 100").all() as { payload: string }[];
  const log = events();
  return { environment: "simulation", initialBalanceMicros: INITIAL_BALANCE, balanceMicros: currentBalance(), mandate: getMeta("mandate"), scenarios: SCENARIOS, runs: rows.map(r => JSON.parse(r.payload)), events: log.slice(0, 200), governance: governanceProposals(), holders: process.env.DEMO_SESSIONS_ENABLED==="false"?[]:HOLDERS, holder: holderId?.startsWith("near:")?walletHolder(holderId.slice(5)):HOLDERS.find(h => h.id === holderId) || null, benchmarks: getMeta("benchmarks"), modelConfigured: Boolean(process.env.OPENAI_API_KEY), discordUrl: process.env.DISCORD_DISCUSSION_URL || null, auditValid: verifyAudit(log), snapshotAt: SNAPSHOT_AT, walletConfigured:walletConfigured(), demoSessionsEnabled:process.env.DEMO_SESSIONS_ENABLED!=="false" };
}
