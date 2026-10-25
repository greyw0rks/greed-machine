import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions, baseEncode } from "near-api-js";
import { nearDecisionSchema, observeNear, toNearProposal } from "../src/lib/near-policy";
import { evaluatePolicy } from "../src/lib/policy";
import { GENESIS_MANDATE, INITIAL_BALANCE, SCENARIOS } from "../src/lib/scenarios";
import type { Proposal } from "../src/lib/types";

const rpcUrl = "https://rpc.testnet.near.org";
const credentialPath = ".near/proof-credentials.json";
interface Credentials { accountId: string; privateKey: string; guardianId: string; guardianPrivateKey: string }
async function main() {
  const deploy = process.argv.includes("--deploy");
  const verify = process.argv.includes("--verify");
  const wasm = await readFile("contracts/policy/target/wasm32-unknown-unknown/release/greed_policy.wasm");
  const codeHash = baseEncode(createHash("sha256").update(wasm).digest());
  await mkdir(".near", { recursive: true, mode: 0o700 });
  let credentials: Credentials;
  try { credentials = JSON.parse(await readFile(credentialPath, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const operatorKey = KeyPair.fromRandom("ed25519"), guardianKey = KeyPair.fromRandom("ed25519");
    const accountId = `greed-policy-${randomUUID().slice(0, 8)}.testnet`;
    credentials = { accountId, privateKey: operatorKey.toString(), guardianId: `guardian.${accountId}`, guardianPrivateKey: guardianKey.toString() };
    await writeFile(credentialPath, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  }
  await chmod(credentialPath, 0o600);
  assert.ok(credentials.accountId.endsWith(".testnet"));
  assert.equal(credentials.guardianId, `guardian.${credentials.accountId}`);
  const plan = { network: "testnet", purpose: "synthetic-policy-proof", account: credentials.accountId, guardian: credentials.guardianId, codeHash, wasmBytes: wasm.length, recordLimit: 1000, funding: "Fresh faucet-funded testnet account; guardian receives 0.2 testnet NEAR", syntheticPrincipal: "100000 USDC", records: ["accepted", "blocked", "replay"], credentialPath };
  await writeFile(".near/proof-plan.json", JSON.stringify(plan, null, 2) + "\n");
  console.log(JSON.stringify(plan, null, 2));
  if (!deploy && !verify) return;
  await observeNear({ rpcUrl }); // Refuse to sign if the endpoint is not testnet.
  const provider = new JsonRpcProvider({ url: rpcUrl });
  const operator = new Account(credentials.accountId, provider, KeyPairSigner.fromSecretKey(credentials.privateKey as `ed25519:${string}`));
  const guardianKey = KeyPair.fromString(credentials.guardianPrivateKey as `ed25519:${string}`);
  const transactions: { step: string; hash: string }[] = [];
  const evidencePath = "evidence/near-testnet.json";
  try {
    const previous = JSON.parse(await readFile(evidencePath, "utf8"));
    if (previous.account === plan.account && previous.codeHash === codeHash && Array.isArray(previous.transactions)) transactions.push(...previous.transactions);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const checkpoint = async () => { await mkdir("evidence", { recursive: true }); await writeFile(evidencePath, JSON.stringify({ ...plan, transactions, completed: false }, null, 2) + "\n"); };
  if (deploy) {
    let state;
    try { state = await operator.getState(); }
    catch (error) {
      if (!/does not exist|UNKNOWN_ACCOUNT|UnknownAccount/i.test(error instanceof Error ? error.message : String(error))) throw error;
      const publicKey = (await operator.getSigner()!.getPublicKey()).toString();
      const faucet = await fetch("https://helper.testnet.near.org/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newAccountId: credentials.accountId, newAccountPublicKey: publicKey }), signal: AbortSignal.timeout(30_000) });
      if (!faucet.ok) throw new Error(`Testnet faucet could not fund the proof account (HTTP ${faucet.status}). Fund ${credentials.accountId} with its public key ${publicKey}, then rerun --deploy.`);
      state = await operator.getState();
    }
    // Never overwrite a previously deployed contract with a different build.
    if (state.codeHash !== "11111111111111111111111111111111" && state.codeHash !== codeHash) throw new Error("Proof account already contains a different contract; refusing to overwrite it.");
    if (state.codeHash !== codeHash) {
      const tx = await operator.signAndSendTransaction({ receiverId: operator.accountId, waitUntil: "FINAL", actions: [actions.deployContract(wasm), actions.functionCall("new", { guardian: credentials.guardianId }, 50_000_000_000_000n, 0n)] });
      transactions.push({ step: "deploy-and-initialize", hash: tx.transaction.hash }); await checkpoint();
    }
    try { await provider.viewAccount({ accountId: credentials.guardianId }); }
    catch (error) {
      if (!/does not exist|UNKNOWN_ACCOUNT|UnknownAccount/i.test(error instanceof Error ? error.message : String(error))) throw error;
      const tx = await operator.createSubAccount({ accountOrPrefix: "guardian", publicKey: guardianKey.getPublicKey(), nearToTransfer: 200_000_000_000_000_000_000_000n });
      transactions.push({ step: "create-isolated-guardian", hash: tx.transaction.hash }); await checkpoint();
    }
    const acceptedRecord = await provider.callFunction({ contractId: operator.accountId, method: "get_record", args: { record_id: "accepted" } });
    const p: Proposal = { id: acceptedRecord ? nearDecisionSchema.parse(acceptedRecord).proposalId : `proof-${randomUUID()}`, agent: "isolated-proof-operator", venue: "lending", contract: "sim.lending", amountMicros: 20_000e6, confidence: .8, expectedBps: 80, reason: "Synthetic NEAR policy proof; no treasury transfer", mandateId: GENESIS_MANDATE.id, expiresAt: Date.now() + 3_600_000 };
    const inputs = [
      { recordId: "accepted", p },
      { recordId: "blocked", p: { ...p, id: `${p.id}-blocked`, contract: "evil.receiver" } },
      { recordId: "replay", p },
    ];
    for (const item of inputs) {
      const existing = await provider.callFunction({ contractId: operator.accountId, method: "get_record", args: { record_id: item.recordId } });
      if (existing !== null) continue;
      const input = toNearProposal(item.p, SCENARIOS[0].dataAgeSeconds);
      const tx = await operator.callFunctionRaw({ contractId: operator.accountId, methodName: "record_decision", args: { record_id: item.recordId, proposal: input }, gas: 50_000_000_000_000n, waitUntil: "FINAL" });
      transactions.push({ step: item.recordId, hash: tx.transaction.hash }); await checkpoint();
      const recorded = nearDecisionSchema.parse(await provider.callFunction({ contractId: operator.accountId, method: "get_record", args: { record_id: item.recordId } }));
      const expected = evaluatePolicy(item.p, GENESIS_MANDATE, INITIAL_BALANCE, SCENARIOS[0], item.recordId === "replay" ? new Set([p.id]) : new Set());
      assert.deepEqual(recorded.checks, expected.checks.map(({ rule, passed }) => ({ rule, passed })));
      assert.equal(recorded.inputHash, createHash("sha256").update(JSON.stringify(input)).digest("hex"));
    }
  }
  const records = await Promise.all(["accepted", "blocked", "replay"].map(recordId => observeNear({ rpcUrl, accountId: operator.accountId, expectedCodeHash: codeHash, recordId })));
  assert.equal(records[0].contract!.record!.allowed, true);
  assert.equal(records[1].contract!.record!.allowed, false);
  assert.equal(records[1].contract!.record!.checks[0].passed, false);
  assert.equal(records[2].contract!.record!.checks[6].passed, false);
  await mkdir("evidence", { recursive: true });
  await writeFile(evidencePath, JSON.stringify({ ...plan, transactions, completed: true, records }, null, 2) + "\n");
  await writeFile(".near/app.env", `NEAR_RPC_URL=${rpcUrl}\nNEAR_POLICY_ACCOUNT=${operator.accountId}\nNEAR_POLICY_CODE_HASH=${codeHash}\nNEAR_PROOF_RECORD_ID=accepted\n`);
  console.log(`Proof verified. Public evidence: ${evidencePath}. App configuration: .near/app.env`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "NEAR proof failed."); process.exitCode = 1; });
