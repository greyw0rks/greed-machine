import type { Holder, Mandate, Scenario } from "./types";
export const MICROS = 1_000_000;
export const INITIAL_BALANCE = 100_000 * MICROS;
export const GENESIS_MANDATE: Mandate = {
  id: "mandate-genesis", name: "Capital preservation", maxSpendMicros: 25_000 * MICROS,
  maxExposureBps: 3500, minReserveBps: 2500, allowedVenues: ["lending", "staking", "hold"], paused: false
};
export const HOLDERS: Holder[] = [
  { id: "ada", name: "Ada", balance: 250_000, role: "Verified Holder" },
  { id: "kai", name: "Kai", balance: 400_000, role: "Researcher" },
  { id: "noa", name: "Noa", balance: 350_000, role: "Guardian" }
];
export const SNAPSHOT_AT = "2026-10-24T00:00:00.000Z";
export const VENUE_CONTRACTS = { lending: "sim.lending", staking: "sim.staking", liquidity: "sim.liquidity", hold: "sim.reserve" };
export const SCENARIOS: Scenario[] = [
  { id: "steady-yield", name: "Steady yield", description: "Stable lending demand. Scouts weigh a liquid lending position against a higher-yield staking lock.", period: "30 days", yieldBps: { lending: 72, staking: 110, liquidity: 170 }, expectedBps: { lending: 80, staking: 120, liquidity: 210 }, drawdownBps: { lending: 20, staking: 100, liquidity: 360 }, liquidityMicros: 250_000 * MICROS, dataAgeSeconds: 12, risk: "low" },
  { id: "liquidity-shock", name: "Liquidity shock", description: "Headline staking returns conceal a thin exit market. Risk review should favor the liquid reserve.", period: "30 days", yieldBps: { lending: 24, staking: -720, liquidity: -1320 }, expectedBps: { lending: 35, staking: 360, liquidity: 620 }, drawdownBps: { lending: 35, staking: 1100, liquidity: 1800 }, liquidityMicros: 8_000 * MICROS, dataAgeSeconds: 15, risk: "high" },
  { id: "rate-reversal", name: "Rate reversal", description: "Rates move against both scouts. This scenario tests whether overhead can turn a modest gain into a loss.", period: "30 days", yieldBps: { lending: -35, staking: -120, liquidity: -440 }, expectedBps: { lending: 50, staking: 95, liquidity: 230 }, drawdownBps: { lending: 80, staking: 220, liquidity: 680 }, liquidityMicros: 190_000 * MICROS, dataAgeSeconds: 21, risk: "medium" },
  { id: "staking-rally", name: "Staking rally", description: "A staking rally outpaces conservative lending. The swarm may underperform a single aggressive scout.", period: "30 days", yieldBps: { lending: 48, staking: 430, liquidity: 590 }, expectedBps: { lending: 55, staking: 140, liquidity: 240 }, drawdownBps: { lending: 25, staking: 180, liquidity: 420 }, liquidityMicros: 300_000 * MICROS, dataAgeSeconds: 14, risk: "low" },
  { id: "stale-oracle", name: "Stale market feed", description: "Market data is 25 minutes old. Both strategies must fail the shared deterministic freshness check.", period: "30 days", yieldBps: { lending: 85, staking: 190, liquidity: 310 }, expectedBps: { lending: 95, staking: 220, liquidity: 400 }, drawdownBps: { lending: 15, staking: 120, liquidity: 300 }, liquidityMicros: 200_000 * MICROS, dataAgeSeconds: 1500, risk: "medium" },
  { id: "flat-market", name: "Flat market", description: "Gross yields barely cover operating costs. Doing nothing is a meaningful benchmark.", period: "30 days", yieldBps: { lending: 0, staking: 0, liquidity: -10 }, expectedBps: { lending: 1, staking: 2, liquidity: 4 }, drawdownBps: { lending: 5, staking: 10, liquidity: 50 }, liquidityMicros: 170_000 * MICROS, dataAgeSeconds: 18, risk: "low" }
];
export function dollars(micros: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(micros / MICROS);
}
