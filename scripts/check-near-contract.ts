import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Sandbox, DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY, GenesisAccount } from "near-sandbox";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions } from "near-api-js";
import { evaluatePolicy } from "../src/lib/policy";
import { toNearProposal, nearDecisionSchema, nearPolicySchema } from "../src/lib/near-policy";
import { GENESIS_MANDATE, INITIAL_BALANCE, SCENARIOS } from "../src/lib/scenarios";
import type { Proposal, Mandate } from "../src/lib/types";

async function main() {
// The downloader renames from the OS temp directory; keep its cache on that filesystem.
process.env.DIR_TO_DOWNLOAD_BINARY ||= join(tmpdir(), "greed-near-sandbox-bin");
process.env.NEAR_RPC_TIMEOUT_SECS ||= "60";
const wasm = await readFile("contracts/policy/target/wasm32-unknown-unknown/release/greed_policy.wasm");
const guardianKey = KeyPair.fromRandom("ed25519"), outsiderKey = KeyPair.fromRandom("ed25519");
const sandbox = await Sandbox.start({ config: { additionalAccounts: [
  new GenesisAccount("guardian", guardianKey.getPublicKey().toString(), guardianKey.toString(), 10n ** 26n),
  new GenesisAccount("outsider", outsiderKey.getPublicKey().toString(), outsiderKey.toString(), 10n ** 26n),
] } });
const provider = new JsonRpcProvider({ url: sandbox.rpcUrl });
const operator = new Account(DEFAULT_ACCOUNT_ID, provider, KeyPairSigner.fromSecretKey(DEFAULT_PRIVATE_KEY));
const guardian = new Account("guardian", provider, new KeyPairSigner(guardianKey));
const outsider = new Account("outsider", provider, new KeyPairSigner(outsiderKey));
const reports: { name: string; passed: boolean }[] = [];
async function check(name: string, fn: () => Promise<void>) { await fn(); reports.push({ name, passed: true }); console.log("Passed:", name); }
const call = (signer: Account, methodName: string, args: Record<string, unknown>) => signer.callFunction({ contractId: operator.accountId, methodName, args, gas: 50_000_000_000_000n, waitUntil: "FINAL" });
const view = (method: string, args: Record<string, unknown> = {}) => provider.callFunction({ contractId: operator.accountId, method, args, blockQuery: { finality: "final" } });
function proposal(overrides: Partial<Proposal> = {}): Proposal { return { id: randomUUID(), agent: "proof-fixture", venue: "lending", contract: "sim.lending", amountMicros: 20_000e6, confidence: .8, expectedBps: 80, reason: "Synthetic parity fixture", mandateId: GENESIS_MANDATE.id, expiresAt: Date.now() + 3_600_000, ...overrides }; }
try {
  await check("atomic deploy and private initialization", async () => {
    await operator.signAndSendTransaction({ receiverId: operator.accountId, waitUntil: "FINAL", actions: [actions.deployContract(wasm), actions.functionCall("new", { guardian: guardian.accountId }, 50_000_000_000_000n, 0n)] });
    const policy = nearPolicySchema.parse(await view("get_policy"));
    assert.equal(policy.owner, operator.accountId); assert.equal(policy.guardian, guardian.accountId);
    await assert.rejects(call(outsider, "new", { guardian: outsider.accountId }));
  });
  const fixtures = [
    { name: "valid allocation", p: proposal(), age: 12 },
    { name: "spend and exposure attack", p: proposal({ amountMicros: 65_000e6 }), age: 12 },
    { name: "unauthorized receiver", p: proposal({ contract: "evil.receiver" }), age: 12 },
    { name: "disallowed liquidity venue", p: proposal({ venue: "liquidity", contract: "sim.liquidity" }), age: 12 },
    { name: "expired proposal", p: proposal({ expiresAt: 1 }), age: 12 },
    { name: "stale feed", p: proposal(), age: 1500 },
    { name: "old mandate", p: proposal({ mandateId: "old-mandate" }), age: 12 },
    { name: "hold with stale feed", p: proposal({ venue: "hold", contract: "sim.reserve", amountMicros: 0 }), age: 1500 },
    { name: "hold spending capital", p: proposal({ venue: "hold", contract: "sim.reserve", amountMicros: 1 }), age: 12 },
    { name: "oversized integer without overflow", p: proposal({ amountMicros: Number.MAX_SAFE_INTEGER }), age: 12 },
  ];
  for (const f of fixtures) await check(`TypeScript / WASM parity: ${f.name}`, async () => {
    const decision = nearDecisionSchema.parse(await view("evaluate", { proposal: toNearProposal(f.p, f.age) }));
    const expected = evaluatePolicy(f.p, GENESIS_MANDATE, INITIAL_BALANCE, { ...SCENARIOS[0], dataAgeSeconds: f.age });
    assert.deepEqual(decision.checks, expected.checks.map(({ rule, passed }) => ({ rule, passed })));
    assert.equal(decision.allowed, expected.allowed);
  });
  await check("future feed and non-integer amount rejected", async () => {
    const input = toNearProposal(proposal(), 0); input.dataObservedAt = String(Date.now() + 3_600_000);
    const decision = nearDecisionSchema.parse(await view("evaluate", { proposal: input }));
    assert.equal(decision.checks[4].passed, false);
    await assert.rejects(view("evaluate", { proposal: { ...input, amountMicros: "1.5" } }));
  });
  await check("persisted decisions, input commitment and replay rejection", async () => {
    const p = proposal(), input = toNearProposal(p, 12);
    const accepted = nearDecisionSchema.parse(await call(operator, "record_decision", { record_id: "accepted", proposal: input }));
    assert.equal(accepted.allowed, true);
    assert.equal(accepted.inputHash, createHash("sha256").update(JSON.stringify(input)).digest("hex"));
    assert.deepEqual(await view("get_record", { record_id: "accepted" }), accepted);
    const replay = nearDecisionSchema.parse(await call(operator, "record_decision", { record_id: "replay", proposal: input }));
    assert.equal(replay.allowed, false); assert.equal(replay.checks[6].passed, false);
    await assert.rejects(call(operator, "record_decision", { record_id: "accepted", proposal: input }));
    assert.equal(nearPolicySchema.parse(await view("get_policy")).recordCount, "2");
  });
  await check("outsider and guardian cannot record proofs or change the mandate", async () => {
    for (const signer of [outsider, guardian]) {
      await assert.rejects(call(signer, "record_decision", { record_id: "intrusion", proposal: toNearProposal(proposal(), 12) }));
      await assert.rejects(call(signer, "update_policy", { id: "intrusion", max_spend_micros: "1000000000", max_exposure_bps: 1000, min_reserve_bps: 5000 }));
    }
  });
  await check("guardian pause blocks allocations and operator cannot unpause", async () => {
    await assert.rejects(call(operator, "set_pause", { paused: true }));
    await call(guardian, "set_pause", { paused: true });
    const p = proposal(), decision = nearDecisionSchema.parse(await view("evaluate", { proposal: toNearProposal(p, 12) }));
    assert.deepEqual(decision.checks, evaluatePolicy(p, { ...GENESIS_MANDATE, paused: true }, INITIAL_BALANCE, SCENARIOS[0]).checks.map(({ rule, passed }) => ({ rule, passed })));
    await assert.rejects(call(outsider, "set_pause", { paused: false }));
    await call(guardian, "set_pause", { paused: false });
  });
  await check("immutable mandate limits and reserve parity", async () => {
    const base = { id: "strict-reserve", max_spend_micros: "25000000000", max_exposure_bps: 3500, min_reserve_bps: 9500 };
    for (const bounds of [{ ...base, max_spend_micros: "25000000001" }, { ...base, max_exposure_bps: 3501 }, { ...base, min_reserve_bps: 2499 }]) await assert.rejects(call(operator, "update_policy", bounds));
    await call(operator, "update_policy", base);
    const p = proposal({ mandateId: base.id, amountMicros: 10_000e6 });
    const mandate: Mandate = { ...GENESIS_MANDATE, id: base.id, minReserveBps: 9500 };
    const decision = nearDecisionSchema.parse(await view("evaluate", { proposal: toNearProposal(p, 12) }));
    assert.deepEqual(decision.checks, evaluatePolicy(p, mandate, INITIAL_BALANCE, SCENARIOS[0]).checks.map(({ rule, passed }) => ({ rule, passed })));
    assert.equal(decision.checks[3].passed, false);
  });
  await mkdir("evidence", { recursive: true });
  await writeFile("evidence/near-sandbox.json", JSON.stringify({ environment: "local-near-sandbox", sdk: "5.29.1", wasmSha256: createHash("sha256").update(wasm).digest("hex"), passed: true, reports }, null, 2) + "\n");
  console.log(`Verified ${reports.length} contract checks in NEAR Sandbox.`);
} finally { await sandbox.tearDown(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
