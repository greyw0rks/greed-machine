import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy, validateMandate } from "../src/lib/policy";
import { GENESIS_MANDATE, INITIAL_BALANCE, SCENARIOS } from "../src/lib/scenarios";
import type { Proposal } from "../src/lib/types";
const proposal: Proposal={id:"test-proposal",agent:"scout",venue:"lending",amountMicros:20_000e6,confidence:.8,expectedBps:80,reason:"Test valid allocation",contract:"sim.lending",expiresAt:Date.now()+60000,mandateId:GENESIS_MANDATE.id};
test("valid proposal passes all eight controls",()=>{const p=evaluatePolicy(proposal,GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]);assert.equal(p.allowed,true);assert.equal(p.checks.length,8);});
test("rejects adversarial allocations, receivers, stale data, expiry, replay and pause",()=>{
  const cases=[
    evaluatePolicy({...proposal,amountMicros:65_000e6},GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]),
    evaluatePolicy({...proposal,amountMicros:-1},GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]),
    evaluatePolicy({...proposal,amountMicros:1.5},GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]),
    evaluatePolicy({...proposal,contract:"evil.receiver"},GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]),
    evaluatePolicy({...proposal,expiresAt:0},GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]),
    evaluatePolicy({...proposal,mandateId:"old"},GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]),
    evaluatePolicy(proposal,GENESIS_MANDATE,INITIAL_BALANCE,{...SCENARIOS[0],dataAgeSeconds:301}),
    evaluatePolicy(proposal,GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0],new Set([proposal.id])),
    evaluatePolicy(proposal,{...GENESIS_MANDATE,paused:true},INITIAL_BALANCE,SCENARIOS[0])
  ];for(const result of cases)assert.equal(result.allowed,false);
});
test("reserve floor can block an amount below spending ceiling",()=>{const result=evaluatePolicy({...proposal,amountMicros:10_000e6},{...GENESIS_MANDATE,minReserveBps:9500},INITIAL_BALANCE,SCENARIOS[0]);assert.equal(result.checks.find(c=>c.rule==="Reserve floor")!.passed,false);});
test("a hold must spend exactly zero",()=>{assert.equal(evaluatePolicy({...proposal,venue:"hold",contract:"sim.reserve",amountMicros:1},GENESIS_MANDATE,INITIAL_BALANCE,SCENARIOS[0]).allowed,false);});
test("governance cannot exceed immutable safety boundaries",()=>{for(const change of [{maxSpendMicros:25001e6,maxExposureBps:3000,minReserveBps:3000},{maxSpendMicros:1000e6,maxExposureBps:3501,minReserveBps:3000},{maxSpendMicros:1000e6,maxExposureBps:3000,minReserveBps:2499}])assert.throws(()=>validateMandate(change));});
