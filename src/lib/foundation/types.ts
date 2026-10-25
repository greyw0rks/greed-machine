import type { AgentMode, AgentRecord, Evaluation, PolicyCheck, Receipt } from "../types";
export type CycleEvaluation = Omit<Evaluation, "receipt"> & { receipt?: Receipt };

export type CyclePhase = "scouting" | "debating" | "security" | "funded" | "settled" | "blocked" | "failed";
export interface DebateEntry { agent: string; round: "proposal" | "challenge" | "response" | "selection"; text: string; candidate: string }
export interface SecurityReview { approved: boolean; source: "deterministic" | "model + deterministic"; checks: PolicyCheck[]; assessment: string; costMicros: number; record?: AgentRecord }
export interface Cycle {
  id: string; sequence: number; scenarioId: string; scenarioName: string; phase: CyclePhase;
  createdAt: number; updatedAt: number; startingEquityMicros: number; reservedMicros: number;
  evaluation?: CycleEvaluation; debate: DebateEntry[]; security?: SecurityReview; netMicros: number | null;
  modelCostMicros?: number; agentMode?:AgentMode;
  error?: string; history: { phase: CyclePhase; time: number; detail: string }[];
}
export interface ModelCallEntry {
  id:string; cycleId:string; phase:CyclePhase; leaseOwner:string; name:string; role:string; requestHash:string;
  inputPrice:number; outputPrice:number; startedAt:number; finishedAt:number|null;
  status:"inflight"|"accounted"|"complete"|"failed"|"uncertain"|"resolved";
  accountedCostMicros:number; record:AgentRecord|null; responseId:string|null; error:string|null; resolution:string|null;
}
export interface Recipient { id: string; name: string; weight: string }
export interface Entitlement { recipientId: string; name: string; weight: string; amountMicros: number; status: "pending" | "paid" | "failed"; attempts: number; receipt: string | null; error: string | null }
export interface Distribution {
  id: string; createdAt: number; profitMicros: number; holderBps: number; holderMicros: number; retainedMicros: number;
  snapshot: { source: "foundation fixture"; hash: string; recipients: Recipient[] };
  status: "pending" | "complete"; entitlements: Entitlement[];
}
export interface FoundationConfig { enabled: boolean; intervalMs: number; holderBps: number; agentMode: AgentMode; recipients: Recipient[]; blockedRecipients: string[] }
export interface EngineState {
  initialMicros: number; cashMicros: number; reservedMicros: number; totalNetMicros: number; profitWatermarkMicros: number;
  distributedMicros: number; retainedMicros: number; sequence: number; nextRunAt: number; paused: boolean;
  heartbeatAt: number | null; leaseOwner: string | null; leaseUntil: number;
}
export interface FoundationEvent { id: number; time: number; kind: string; subject: string; detail: string; evidence: unknown; previousHash: string; hash: string }
export interface FoundationData {
  environment: "foundation simulation"; engine: EngineState; config: FoundationConfig; cycles: Cycle[]; distributions: Distribution[];
  events: FoundationEvent[]; auditValid: boolean; reconciled: boolean; pendingMicros: number; availableMicros: number;
  modelCalls:ModelCallEntry[]; accountingComplete:boolean; unresolvedModelCalls:number;
  modelConfigured: boolean; scenarios: { id: string; name: string; description: string }[];
}
