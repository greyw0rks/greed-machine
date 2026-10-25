import { test } from "node:test";
import assert from "node:assert/strict";
import { observeNear, toNearProposal, nearDecisionSchema } from "../src/lib/near-policy";
import { GENESIS_MANDATE } from "../src/lib/scenarios";
import type { Proposal } from "../src/lib/types";

const blockHash = "A".repeat(44), codeHash = "B".repeat(44);
const policy = { schemaVersion: 1, purpose: "synthetic-policy-proof", owner: "greed-proof.testnet", guardian: "guardian.greed-proof.testnet", syntheticBalanceMicros: "100000000000", allowedVenues: ["lending", "staking", "hold"], policy: { id: GENESIS_MANDATE.id, maxSpendMicros: "25000000000", maxExposureBps: 3500, minReserveBps: 2500, paused: false }, recordCount: "1" };
const rules = ["Contract & action allowlist", "Transaction ceiling", "Exposure limit", "Reserve floor", "Current mandate & fresh data", "Proposal expiry", "Replay protection", "Emergency pause"];
const decision = { proposalId: "proposal-1", allowed: true, checks: rules.map(rule => ({ rule, passed: true })), recordedAt: "1792920000000", policy: policy.policy, inputHash: "f".repeat(64), environment: "synthetic-policy-proof" };
const config = { rpcUrl: "https://rpc.testnet.near.org", accountId: policy.owner, expectedCodeHash: codeHash, recordId: "accepted" };
const status = { chain_id: "testnet", sync_info: { latest_block_height: 100, latest_block_hash: blockHash, syncing: false } };
function mock(options: { status?: unknown; policy?: unknown; record?: unknown; codeHash?: string; blockHash?: string; httpError?: boolean; rpcError?: boolean } = {}) {
  const calls: { method: string; params: Record<string, unknown> }[] = [];
  const request: typeof fetch = async (_url, init) => {
    const call = JSON.parse(String(init?.body)); calls.push(call);
    if (options.httpError) return Response.json({}, { status: 503 });
    if (options.rpcError) return Response.json({ error: { message: "Bad RPC" } });
    let result: unknown;
    if (call.method === "status") result = options.status || status;
    else if (call.params.request_type === "view_account") result = { code_hash: options.codeHash || codeHash, block_hash: blockHash, block_height: 98 };
    else result = { result: [...Buffer.from(JSON.stringify(call.params.method_name === "get_policy" ? options.policy ?? policy : "record" in options ? options.record : decision))], block_hash: options.blockHash || blockHash };
    return Response.json({ result });
  };
  return { request, calls };
}
test("NEAR proof checks code and reads policy and decision at one finalized block", async () => {
  const m = mock(), result = await observeNear(config, m.request);
  assert.equal(result.contract?.codeVerified, true); assert.deepEqual(result.contract?.record, decision);
  assert.equal(m.calls[1].params.finality, "final");
  for (const call of m.calls.slice(2)) assert.equal(call.params.block_id, blockHash);
  assert.equal(m.calls.length, 4);
});
test("network-only verification never claims a project contract proof", async () => {
  const m = mock(), result = await observeNear({ rpcUrl: config.rpcUrl }, m.request);
  assert.equal(result.contract, null); assert.equal(m.calls.length, 1);
});
test("wrong network, syncing nodes and RPC failures fail verification", async () => {
  for (const options of [{ status: { ...status, chain_id: "mainnet" } }, { status: { ...status, sync_info: { ...status.sync_info, syncing: true } } }, { httpError: true }, { rpcError: true }]) await assert.rejects(observeNear(config, mock(options).request));
});
test("mismatched deployment hash or inconsistent finalized blocks fail verification", async () => {
  await assert.rejects(observeNear(config, mock({ codeHash: "C".repeat(44) }).request), /expected WebAssembly/);
  await assert.rejects(observeNear(config, mock({ blockHash: "C".repeat(44) }).request), /same finalized block/);
});
test("missing records and unrelated contract schemas cannot become policy proofs", async () => {
  await assert.rejects(observeNear(config, mock({ record: null }).request), /not found/);
  for (const invalid of [{ ...policy, purpose: "treasury" }, { ...policy, policy: { ...policy.policy, maxExposureBps: 5000 } }, { ...policy, owner: "other.testnet" }]) await assert.rejects(observeNear(config, mock({ policy: invalid }).request));
});
test("decision validation requires all eight unique checks and a consistent verdict", () => {
  assert.equal(nearDecisionSchema.safeParse(decision).success, true);
  for (const invalid of [{ ...decision, allowed: false }, { ...decision, checks: decision.checks.slice(1) }, { ...decision, checks: Array(8).fill(decision.checks[0]) }]) assert.equal(nearDecisionSchema.safeParse(invalid).success, false);
});
test("testnet account and proof configuration is checked before making network calls", async () => {
  const m = mock();
  for (const invalid of [{ ...config, accountId: "greed.near" }, { ...config, recordId: "x".repeat(101) }, { ...config, expectedCodeHash: "invalid" }]) await assert.rejects(observeNear(invalid, m.request));
  assert.equal(m.calls.length, 0);
});
test("proof inputs preserve integer units and convert scenario age to an absolute timestamp", () => {
  const p: Proposal = { id: "p", agent: "scout", venue: "lending", contract: "sim.lending", amountMicros: 20_000e6, mandateId: GENESIS_MANDATE.id, expiresAt: 200000, confidence: .8, expectedBps: 80, reason: "test" };
  assert.equal(toNearProposal(p, 12, 100000).dataObservedAt, "88000");
  assert.equal(toNearProposal(p, 12, 100000).amountMicros, "20000000000");
  for (const amountMicros of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => toNearProposal({ ...p, amountMicros }, 12, 100000));
});
