import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dashboard, createGovernance, currentBalance, executeGovernance, finalizeGovernance, findRun, getMeta, saveBenchmark, saveRun, setPause, vote, appendEvent, transaction } from "@/lib/database";
import { requireHolder, sessionHolder, setSession } from "@/lib/auth";
import { evaluateScenario } from "@/lib/agents";
import { INITIAL_BALANCE, SCENARIOS } from "@/lib/scenarios";
import { evaluatePolicy } from "@/lib/policy";
import type { Mandate } from "@/lib/types";
import { randomUUID } from "node:crypto";
import { hasSameOrigin } from "@/lib/request-security";
import { GovernanceRpc } from "@/lib/near-governance";
import { governanceProposals } from "@/lib/database";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("session"), holderId: z.enum(["ada", "kai", "noa"]).nullable() }),
  z.object({ action: z.literal("run"), scenarioId: z.string(), agentMode: z.enum(["simulation", "model"]), requestKey: z.string().uuid() }),
  z.object({ action: z.literal("benchmark") }),
  z.object({ action: z.literal("risk"), attack: z.enum(["exposure", "contract", "expiry", "replay", "pause", "reserve", "freshness", "amount"]) }),
  z.object({ action: z.literal("propose"), title: z.string().trim().min(4).max(90), description: z.string().trim().min(10).max(600), maxSpendUsd: z.number().min(1).max(25000), maxExposurePercent: z.number().min(1).max(35), minReservePercent: z.number().min(25).max(95) }),
  z.object({ action: z.literal("vote"), proposalId: z.string().uuid(), choice: z.enum(["for", "against"]) }),
  z.object({ action: z.literal("finalize"), proposalId: z.string().uuid() }),
  z.object({ action: z.literal("execute"), proposalId: z.string().uuid() }),
  z.object({ action: z.literal("pause"), paused: z.boolean() })
]);
export async function GET() { return NextResponse.json(dashboard(await sessionHolder()), { headers: { "Cache-Control": "no-store" } }); }
export async function POST(req: NextRequest) {
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Request origin does not match this app." }, { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > 16000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  try {
    const data = actionSchema.parse(await req.json());
    let result: unknown = null;
    if (data.action === "session") await setSession(data.holderId);
    else {
      const holderId = await requireHolder();
      if (data.action === "run") {
        const existing = findRun(data.requestKey);
        if (existing) result = existing;
        else {
          const scenario = SCENARIOS.find(s => s.id === data.scenarioId); if (!scenario) throw new Error("Unknown scenario.");
          const balance = currentBalance();
          const evaluation = await evaluateScenario(scenario, getMeta<Mandate>("mandate"), balance, "swarm", data.agentMode);
          result = saveRun(evaluation, data.requestKey, balance);
        }
      } else if (data.action === "benchmark") {
        const mandate = getMeta<Mandate>("mandate");
        const rows = await Promise.all(SCENARIOS.map(async scenario => {
          const [swarm, single, noTrade] = await Promise.all(["swarm", "single", "no-trade"].map(mode => evaluateScenario(scenario, mandate, INITIAL_BALANCE, mode as "swarm" | "single" | "no-trade", "simulation")));
          return { scenario: scenario.name, scenarioId: scenario.id, swarm, single, noTrade };
        }));
        saveBenchmark(rows); result = rows;
      } else if (data.action === "risk") {
        const mandate = structuredClone(getMeta<Mandate>("mandate"));
        const scenario = structuredClone(SCENARIOS[0]);
        const evaluation = await evaluateScenario(scenario, mandate, currentBalance());
        const proposal = { ...evaluation.proposals[0], id: randomUUID() };
        const executed = new Set<string>();
        if (data.attack === "exposure") proposal.amountMicros = 65_000e6;
        if (data.attack === "contract") proposal.contract = "untrusted.drain";
        if (data.attack === "expiry") proposal.expiresAt = Date.now() - 1000;
        if (data.attack === "replay") executed.add(proposal.id);
        if (data.attack === "pause") mandate.paused = true;
        if (data.attack === "reserve") proposal.amountMicros = Math.floor(currentBalance() * 0.9);
        if (data.attack === "freshness") scenario.dataAgeSeconds = 1800;
        if (data.attack === "amount") proposal.amountMicros = -10e6;
        const policy = evaluatePolicy(proposal, mandate, currentBalance(), scenario, executed);
        result = { attack: data.attack, proposal, policy };
        transaction(() => appendEvent("security-test", data.attack, policy.allowed ? "Adversarial probe unexpectedly passed." : "Synthetic attack blocked. Treasury unchanged.", result));
      } else if (data.action === "propose") {
        const rpc=new GovernanceRpc();const snapshot=holderId.startsWith("near:")?await rpc.snapshot():undefined;
        if(snapshot&&BigInt((await rpc.balance(snapshot,holderId.slice(5))).rawBalance)===0n)throw new Error("A positive token balance is required to propose a mandate.");
        result=createGovernance(data.title,data.description,{maxSpendMicros:Math.round(data.maxSpendUsd*1e6),maxExposureBps:Math.round(data.maxExposurePercent*100),minReserveBps:Math.round(data.minReservePercent*100)},holderId,Date.now(),snapshot);
      } else if (data.action === "vote") {
        const proposal=governanceProposals().find(p=>p.id===data.proposalId);if(!proposal)throw new Error("Unknown proposal.");
        const weight=proposal.snapshot&&holderId.startsWith("near:")?await new GovernanceRpc().balance(proposal.snapshot,holderId.slice(5)):undefined;
        vote(data.proposalId,holderId,data.choice,Date.now(),weight);
      }
      else if (data.action === "finalize") finalizeGovernance(data.proposalId);
      else if (data.action === "execute") executeGovernance(data.proposalId);
      else if (data.action === "pause") setPause(data.paused, holderId);
    }
    return NextResponse.json({ state: dashboard(await sessionHolder()), result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const validation = error instanceof z.ZodError;
    const message = validation ? "Invalid input. Check the fields and try again." : error instanceof Error ? error.message : "Action could not complete. Try again.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Choose a demo") ? 401 : 400 });
  }
}
