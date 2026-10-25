import { evaluateScenario, modelCall, awaitCalls, type ModelCaller } from "../agents";
import { GENESIS_MANDATE, VENUE_CONTRACTS } from "../scenarios";
import { randomUUID } from "node:crypto";
import { evaluatePolicy } from "../policy";
import { z } from "zod";
import type { AgentMode, Scenario } from "../types";
import type { CycleEvaluation, DebateEntry, SecurityReview } from "./types";

export async function scout(scenario: Scenario, balanceMicros: number, mode: AgentMode, call:ModelCaller=modelCall) {
  const { receipt: _preview, ...evaluation } = await evaluateScenario(scenario, GENESIS_MANDATE, balanceMicros, "swarm", mode,call);
  return evaluation;
}
export async function debate(evaluation: CycleEvaluation, scenario: Scenario, call:ModelCaller=modelCall): Promise<DebateEntry[]> {
  const entries: DebateEntry[]=[];
  for (const p of evaluation.proposals) {
    entries.push({agent:p.agent,round:"proposal",text:p.reason,candidate:p.venue});
    entries.push({agent:"Adversarial analyst",round:"challenge",candidate:p.venue,text:p.venue==="staking"?`The staking lock constrains our exit. Expected drawdown is ${scenario.drawdownBps.staking/100}% versus ${scenario.drawdownBps.lending/100}% for lending. Why accept that extra exposure?`:`The ${scenario.expectedBps.lending/100}% expected return is gross. Gas, slippage and analytical costs reduce the realized result; feed age is ${scenario.dataAgeSeconds} seconds.`});
    entries.push({agent:p.agent,round:"response",candidate:p.venue,text:p.venue==="staking"?`Expected staking yield is ${scenario.expectedBps.staking/100}%, but an attractive forecast cannot override liquidity or reserve limits. Reject the position if the exit budget fails.`:`The proposal uses ${p.amountMicros/1e6} of synthetic principal. Lending keeps the position liquid; the security layer must still verify fresh inputs and the exact receiver.`});
  }
  if(evaluation.agentMode==="model") {
    const {yieldBps:_hidden,...market}=scenario;
    const schema=z.object({reasoning:z.string().min(10).max(2000)});
    const challenge=await call("Adversarial analyst","adversarial reviewer",{market,proposals:evaluation.proposals,task:"Challenge the capital, exit and yield assumptions of these proposals. Do not execute."},schema);
    evaluation.agents.push(challenge.record);
    entries.splice(0,entries.length,...evaluation.proposals.map(p=>({agent:p.agent,round:"proposal" as const,text:p.reason,candidate:p.venue})),{agent:"Adversarial analyst",round:"challenge",text:challenge.value.reasoning,candidate:"all"});
    const responses=await awaitCalls(evaluation.proposals.map(p=>call(p.agent,"proposal defender; respond to the challenge and acknowledge weaknesses",{market,proposal:p,challenge:challenge.value.reasoning},schema)));
    for(let i=0;i<responses.length;i++){evaluation.agents.push(responses[i].record);entries.push({agent:evaluation.proposals[i].agent,round:"response",text:responses[i].value.reasoning,candidate:evaluation.proposals[i].venue});}
    const selection=await call("Final portfolio selector","portfolio selector",{market,proposals:evaluation.proposals,debate:entries,task:"Choose the ID of one unchanged proposal after the debate, or reserve. You may not invent an action or increase capital."},z.object({proposalId:z.string(),reasoning:z.string().min(10).max(2000)}));
    const winner=evaluation.proposals.find(p=>p.id===selection.value.proposalId);
    if(!winner&&selection.value.proposalId!=="reserve")throw new Error("Final selector returned an unknown proposal ID.");
    evaluation.selected=winner?{...winner}:{id:randomUUID(),agent:"Final portfolio selector",venue:"hold",amountMicros:0,reason:selection.value.reasoning,confidence:1,expectedBps:0,contract:VENUE_CONTRACTS.hold,expiresAt:Date.now()+300000,mandateId:GENESIS_MANDATE.id};
    evaluation.agents.push(selection.record);
    entries.push({agent:"Final portfolio selector",round:"selection",candidate:evaluation.selected.venue,text:selection.value.reasoning});
    return entries;
  }
  const selector=evaluation.agents.find(a=>a.name==="Portfolio selector");
  entries.push({agent:"Portfolio selector",round:"selection",candidate:evaluation.selected.venue,text:selector?.reasoning||evaluation.selected.reason});
  return entries;
}
export async function review(evaluation: CycleEvaluation, scenario: Scenario, availableMicros: number, paused: boolean, call:ModelCaller=modelCall): Promise<SecurityReview> {
  const p=evaluation.selected;
  const hard=evaluatePolicy(p,{...GENESIS_MANDATE,paused},availableMicros,scenario);
  const checks=[...hard.checks,
    {rule:"Exit liquidity",passed:p.venue==="hold"||scenario.liquidityMicros>=p.amountMicros*2,evidence:`${scenario.liquidityMicros/1e6} liquid; at least 2× allocated capital required.`},
    {rule:"Settlement adapter",passed:p.contract.startsWith("sim."),evidence:"Only the isolated foundation simulation adapter is enabled."},
    {rule:"Payout liabilities protected",passed:p.amountMicros<=availableMicros,evidence:"Available capital excludes unpaid holder entitlements."}
  ];
  let assessment=checks.every(c=>c.passed)?"Receiver, liquidity, policy and reserve checks passed. Funding is limited to the simulation adapter.":"Funding refused. One or more independent checks failed; the candidate cannot access capital.";
  let approved=checks.every(c=>c.passed),costMicros=20_000,record;
  if(evaluation.agentMode==="model") {
    const {yieldBps:_hidden,...market}=scenario;
    const result=await call("Independent security reviewer","security reviewer; approve only if evidence supports safety, never override failed hard checks",{proposal:p,market,checks},z.object({approved:z.boolean(),reasoning:z.string().min(10).max(2000)}));
    assessment=result.value.reasoning;approved=approved&&result.value.approved;costMicros=result.record.costMicros;record=result.record;
    checks.push({rule:"Independent AI verdict",passed:result.value.approved,evidence:assessment});
  }
  return {approved,source:evaluation.agentMode==="model"?"model + deterministic":"deterministic",checks,assessment,costMicros,...(record?{record}:{})};
}
