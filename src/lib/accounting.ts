import type { PolicyResult, Proposal, Receipt, Scenario } from "./types";
export function settle(proposal: Proposal, scenario: Scenario, policy: PolicyResult, agentCostMicros: number, receiptId: string): Receipt {
  if (!Number.isSafeInteger(agentCostMicros) || agentCostMicros < 0) throw new Error("Agent costs must be nonnegative integer microdollars.");
  const executes = policy.allowed && proposal.venue !== "hold";
  const capitalMicros = executes ? proposal.amountMicros : 0;
  const grossMicros = executes ? Math.round(capitalMicros * scenario.yieldBps[proposal.venue as "lending" | "staking" | "liquidity"] / 10_000) : 0;
  const transactionCostMicros = executes ? 1_850_000 : 0;
  const slippageMicros = executes ? Math.round(capitalMicros * (scenario.liquidityMicros < capitalMicros * 2 ? 45 : 2) / 10_000) : 0;
  const proceedsMicros = capitalMicros + grossMicros;
  const netMicros = grossMicros - transactionCostMicros - slippageMicros - agentCostMicros;
  return { id: receiptId, environment: "simulation", capitalMicros, proceedsMicros, transactionCostMicros, slippageMicros, agentCostMicros, grossMicros, netMicros, drawdownBps: executes ? scenario.drawdownBps[proposal.venue as "lending" | "staking" | "liquidity"] : 0 };
}
export function reconcile(receipt: Receipt) {
  return receipt.proceedsMicros - receipt.capitalMicros - receipt.transactionCostMicros - receipt.slippageMicros - receipt.agentCostMicros === receipt.netMicros;
}
