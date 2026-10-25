import { VENUE_CONTRACTS } from "./scenarios";
import type { Mandate, PolicyResult, Proposal, Scenario } from "./types";
export function evaluatePolicy(proposal: Proposal, mandate: Mandate, balanceMicros: number, scenario: Scenario, executed = new Set<string>(), now = Date.now()): PolicyResult {
  const hold = proposal.venue === "hold";
  const validAmount = Number.isSafeInteger(proposal.amountMicros) && proposal.amountMicros >= 0 && (!hold || proposal.amountMicros === 0);
  const checks = [
    { rule: "Contract & action allowlist", passed: mandate.allowedVenues.includes(proposal.venue) && proposal.contract === VENUE_CONTRACTS[proposal.venue], evidence: `${proposal.contract} · ${proposal.venue}` },
    { rule: "Transaction ceiling", passed: validAmount && proposal.amountMicros <= mandate.maxSpendMicros, evidence: `${proposal.amountMicros / 1e6} USDC requested; ${mandate.maxSpendMicros / 1e6} USDC ceiling; integer amount required` },
    { rule: "Exposure limit", passed: validAmount && proposal.amountMicros * 10_000 <= balanceMicros * mandate.maxExposureBps, evidence: `${balanceMicros > 0 ? (proposal.amountMicros / balanceMicros * 100).toFixed(2) : "0"}% exposure; ${(mandate.maxExposureBps / 100).toFixed(0)}% maximum` },
    { rule: "Reserve floor", passed: validAmount && (balanceMicros - proposal.amountMicros) * 10_000 >= balanceMicros * mandate.minReserveBps, evidence: `${(balanceMicros - proposal.amountMicros) / 1e6} USDC available after allocation; ${mandate.minReserveBps / 100}% reserve required` },
    { rule: "Current mandate & fresh data", passed: proposal.mandateId === mandate.id && (hold || scenario.dataAgeSeconds <= 300), evidence: `${proposal.mandateId}; feed age ${scenario.dataAgeSeconds}s; freshness ceiling 300s` },
    { rule: "Proposal expiry", passed: proposal.expiresAt > now, evidence: `Expires ${new Date(proposal.expiresAt).toISOString()}` },
    { rule: "Replay protection", passed: !executed.has(proposal.id), evidence: `Proposal ${proposal.id} ${executed.has(proposal.id) ? "already executed" : "has not executed"}` },
    { rule: "Emergency pause", passed: !mandate.paused, evidence: mandate.paused ? "Treasury is paused by a guardian" : "Treasury is available" }
  ];
  return { allowed: checks.every(c => c.passed), checks };
}
export function validateMandate(change: { maxSpendMicros: number; maxExposureBps: number; minReserveBps: number }) {
  if (!Number.isSafeInteger(change.maxSpendMicros) || change.maxSpendMicros < 1e6 || change.maxSpendMicros > 25_000e6) throw new Error("Spend ceiling must be between 1 and 25,000 USDC.");
  if (!Number.isInteger(change.maxExposureBps) || change.maxExposureBps < 100 || change.maxExposureBps > 3500) throw new Error("Exposure must be between 1% and the hard 35% ceiling.");
  if (!Number.isInteger(change.minReserveBps) || change.minReserveBps < 2500 || change.minReserveBps > 9500) throw new Error("Reserve must be between the hard 25% floor and 95%.");
  return change;
}
