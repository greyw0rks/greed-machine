export type Venue = "lending" | "staking" | "liquidity" | "hold";
export type StrategyMode = "swarm" | "single" | "no-trade";
export type AgentMode = "simulation" | "model";
export interface Mandate {
  id: string; name: string; maxSpendMicros: number; maxExposureBps: number;
  minReserveBps: number; allowedVenues: Venue[]; paused: boolean;
}
export interface Scenario {
  id: string; name: string; description: string; period: string;
  yieldBps: Record<Exclude<Venue, "hold">, number>;
  expectedBps: Record<Exclude<Venue, "hold">, number>;
  drawdownBps: Record<Exclude<Venue, "hold">, number>;
  liquidityMicros: number; dataAgeSeconds: number; risk: "low" | "medium" | "high";
}
export interface Proposal {
  id: string; agent: string; venue: Venue; amountMicros: number; confidence: number;
  expectedBps: number; reason: string; contract: string; expiresAt: number; mandateId: string;
}
export interface AgentRecord {
  name: string; role: string; reasoning: string; costMicros: number; inputTokens: number;
  outputTokens: number; provider: "deterministic simulation" | "model";
}
export interface PolicyCheck { rule: string; passed: boolean; evidence: string }
export interface PolicyResult { allowed: boolean; checks: PolicyCheck[] }
export interface Receipt {
  id: string; environment: "simulation"; capitalMicros: number; proceedsMicros: number;
  transactionCostMicros: number; slippageMicros: number; agentCostMicros: number;
  grossMicros: number; netMicros: number; drawdownBps: number;
}
export interface Evaluation {
  id: string; scenarioId: string; scenarioName: string; createdAt: number;
  mode: StrategyMode; agentMode: AgentMode; proposals: Proposal[]; agents: AgentRecord[];
  selected: Proposal; policy: PolicyResult; receipt: Receipt; mandate: Mandate;
}
export interface AuditEvent {
  id: number; time: number; type: string; subject: string; detail: string;
  evidence: unknown; previousHash: string; hash: string;
}
export interface Holder { id: string; name: string; balance: number; role: string; auth?: "demo" | "wallet"; rawBalance?: string; tokenAccount?: string; balanceBlock?: number; balanceSnapshot?: TokenSnapshot }
export interface TokenSnapshot { environment: "testnet"; tokenAccount: string; codeHash: string; blockHash: string; blockHeight: number; timestamp: number; totalSupply: string; decimals: number; symbol: string }
export interface GovernanceProposal {
  id: string; title: string; description: string; change: Pick<Mandate, "maxSpendMicros" | "maxExposureBps" | "minReserveBps">;
  createdAt: number; deadline: number; executeAfter: number | null;
  status: "open" | "timelock" | "executed" | "rejected";
  votes: { holderId: string; choice: "for" | "against"; weight: number; rawBalance?: string }[];
  snapshot?: TokenSnapshot;
}
export interface BenchmarkRow {
  scenario: string; scenarioId: string; swarm: Evaluation; single: Evaluation; noTrade: Evaluation;
}
export interface DashboardData {
  environment: "simulation"; initialBalanceMicros: number; balanceMicros: number;
  mandate: Mandate; scenarios: Scenario[]; runs: Evaluation[]; events: AuditEvent[];
  governance: GovernanceProposal[]; holders: Holder[]; holder: Holder | null;
  benchmarks: BenchmarkRow[]; modelConfigured: boolean; discordUrl: string | null;
  auditValid: boolean; snapshotAt: string;
  walletConfigured: boolean;
  demoSessionsEnabled: boolean;
}
