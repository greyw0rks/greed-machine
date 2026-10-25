import { z } from "zod";
import type { Proposal } from "./types";

const integerString = z.string().regex(/^(0|[1-9]\d*)$/).refine(value => BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER));
const hash = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const account = z.string().min(2).max(64).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const rules = ["Contract & action allowlist", "Transaction ceiling", "Exposure limit", "Reserve floor", "Current mandate & fresh data", "Proposal expiry", "Replay protection", "Emergency pause"] as const;
export const nearPolicySchema = z.object({
  schemaVersion: z.literal(1), purpose: z.literal("synthetic-policy-proof"),
  owner: account, guardian: account, syntheticBalanceMicros: z.literal("100000000000"),
  allowedVenues: z.tuple([z.literal("lending"), z.literal("staking"), z.literal("hold")]),
  policy: z.object({ id: z.string().min(1).max(100), maxSpendMicros: integerString.refine(v => Number(v) >= 1e6 && Number(v) <= 25_000e6), maxExposureBps: z.number().int().min(100).max(3500), minReserveBps: z.number().int().min(2500).max(9500), paused: z.boolean() }),
  recordCount: integerString,
});
export const nearDecisionSchema = z.object({
  proposalId: z.string().min(1).max(100), allowed: z.boolean(),
  checks: z.array(z.object({ rule: z.enum(rules), passed: z.boolean() })).length(8),
  recordedAt: integerString, policy: nearPolicySchema.shape.policy,
  inputHash: z.string().regex(/^[a-f0-9]{64}$/), environment: z.literal("synthetic-policy-proof"),
}).refine(v => v.checks.every((c, i) => c.rule === rules[i]) && v.allowed === v.checks.every(c => c.passed), "Invalid decision checks");

export interface NearConfig { rpcUrl: string; accountId?: string; expectedCodeHash?: string; recordId?: string }
export interface NearObservation {
  connected: true; chainId: "testnet"; blockHeight: number; blockHash: string; observedAt: string;
  contract: null | { account: string; codeHash: string; codeVerified: boolean; blockHeight: number; blockHash: string; policy: z.infer<typeof nearPolicySchema>; recordId: string | null; record: z.infer<typeof nearDecisionSchema> | null };
  note: string;
}

export function toNearProposal(proposal: Proposal, dataAgeSeconds: number, now = Date.now()) {
  if (!Number.isSafeInteger(proposal.amountMicros) || proposal.amountMicros < 0 || !Number.isSafeInteger(proposal.expiresAt) || !Number.isSafeInteger(now) || !Number.isSafeInteger(dataAgeSeconds) || dataAgeSeconds < 0 || dataAgeSeconds * 1000 > now) throw new Error("Invalid policy proof input.");
  return { id: proposal.id, venue: proposal.venue, contract: proposal.contract, amountMicros: String(proposal.amountMicros), mandateId: proposal.mandateId, expiresAt: String(proposal.expiresAt), dataObservedAt: String(now - dataAgeSeconds * 1000) };
}

export async function observeNear(config: NearConfig, request: typeof fetch = fetch): Promise<NearObservation> {
  const url = new URL(config.rpcUrl);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Invalid NEAR RPC URL.");
  if (config.accountId && (!account.safeParse(config.accountId).success || !config.accountId.endsWith(".testnet"))) throw new Error("Policy account must be a NEAR testnet account.");
  if (config.expectedCodeHash && !hash.safeParse(config.expectedCodeHash).success) throw new Error("Invalid expected policy code hash.");
  if (config.recordId && (config.recordId.length > 100 || !/^[a-zA-Z0-9._-]+$/.test(config.recordId))) throw new Error("Invalid proof record ID.");
  async function rpc(method: string, params: unknown): Promise<unknown> {
    const res = await request(config.rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: `greed-${method}`, method, params }), signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (!res.ok) throw new Error("NEAR RPC unavailable.");
    const body = z.object({ result: z.unknown().optional(), error: z.unknown().optional() }).parse(await res.json());
    if (body.error || body.result === undefined) throw new Error("NEAR RPC rejected the verification request.");
    return body.result;
  }
  const status = z.object({ chain_id: z.literal("testnet"), sync_info: z.object({ latest_block_height: z.number().int().positive().safe(), latest_block_hash: hash, syncing: z.boolean() }) }).safeParse(await rpc("status", []));
  if (!status.success) throw new Error("RPC did not report a valid NEAR testnet status.");
  if (status.data.sync_info.syncing) throw new Error("NEAR RPC is still syncing.");
  let contract: NearObservation["contract"] = null;
  if (config.accountId) {
    const state = z.object({ code_hash: hash, block_hash: hash, block_height: z.number().int().positive().safe() }).parse(await rpc("query", { request_type: "view_account", finality: "final", account_id: config.accountId }));
    if (config.expectedCodeHash && config.expectedCodeHash !== state.code_hash) throw new Error("Deployed policy code does not match the expected WebAssembly hash.");
    async function view(method: string, args: Record<string, string>) {
      const result = z.object({ result: z.array(z.number().int().min(0).max(255)), block_hash: hash }).parse(await rpc("query", { request_type: "call_function", block_id: state.block_hash, account_id: config.accountId, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString("base64") }));
      if (result.block_hash !== state.block_hash) throw new Error("Contract views did not use the same finalized block.");
      return JSON.parse(Buffer.from(result.result).toString("utf8")) as unknown;
    }
    const [policyValue, recordValue] = await Promise.all([view("get_policy", {}), config.recordId ? view("get_record", { record_id: config.recordId }) : Promise.resolve(null)]);
    const policy = nearPolicySchema.parse(policyValue);
    if (policy.owner !== config.accountId) throw new Error("Policy operator does not match the configured contract.");
    const record = recordValue === null ? null : nearDecisionSchema.parse(recordValue);
    if (config.recordId && !record) throw new Error("Configured policy proof record was not found.");
    contract = { account: config.accountId, codeHash: state.code_hash, codeVerified: Boolean(config.expectedCodeHash), blockHeight: state.block_height, blockHash: state.block_hash, policy, recordId: config.recordId || null, record };
  }
  return { connected: true, chainId: "testnet", blockHeight: status.data.sync_info.latest_block_height, blockHash: status.data.sync_info.latest_block_hash, observedAt: new Date().toISOString(), contract, note: "NEAR policy evidence uses synthetic inputs. Treasury settlement and holder governance remain simulated." };
}
