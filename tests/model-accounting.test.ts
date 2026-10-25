import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { db } from "../src/lib/database";
import { configureFoundation, foundationData, freezeDistribution, pauseFoundation, payDistributions, requestCycle, resolveModelCall, tickFoundation, WORKER_LEASE_MS, WORKER_HEARTBEAT_MS } from "../src/lib/foundation/store";
import type { FoundationData } from "../src/lib/foundation/types";

process.env.GREED_DB_PATH=join(mkdtempSync(join(tmpdir(),"greed-model-accounting-")),"foundation.sqlite");
process.env.OPENAI_API_KEY="fixture-provider-key";
process.env.OPENAI_INPUT_USD_PER_MILLION="1";
process.env.OPENAI_OUTPUT_USD_PER_MILLION="2";
const initial=foundationData();
beforeEach(()=>{
  db().exec("DELETE FROM foundation_model_calls; DELETE FROM foundation_cycles; DELETE FROM foundation_distributions; DELETE FROM foundation_events;");
  db().prepare("UPDATE foundation_meta SET payload=? WHERE key='state'").run(JSON.stringify(initial.engine));
  db().prepare("UPDATE foundation_meta SET payload=? WHERE key='config'").run(JSON.stringify({...initial.config,agentMode:"model"}));
});
function answer(init?:RequestInit,change:Record<string,unknown>={}){
  const body=JSON.parse(String(init?.body)),system=body.messages[0].content as string,name=system.split(", a ")[0].replace("You are ","");
  let value:unknown;
  if(system.includes("proposal defender")||name==="Adversarial analyst")value={reasoning:"The liquidity and return assumptions remain bounded by independent controls."};
  else if(name==="Risk guardian")value={reasoning:"Prefer the liquid candidate under the current reserve and exit limits.",preferredVenue:"lending"};
  else if(name==="Final portfolio selector")value={proposalId:JSON.parse(body.messages[1].content).proposals[0].id,reasoning:"Choose the unchanged liquid proposal after considering the challenge."};
  else if(name==="Independent security reviewer")value={approved:true,reasoning:"The fixture receiver and hard limits permit the bounded action."};
  else value={venue:name==="Momentum scout"?"staking":"lending",amountUsd:20000,confidence:.8,reason:"Bound the allocation and preserve the liquid reserve for future operations."};
  return new Response(JSON.stringify({id:`fixture-${name}`,usage:{prompt_tokens:100,completion_tokens:10},choices:[{message:{content:JSON.stringify(value)}}],...change}),{status:200});
}
const nameOf=(init?:RequestInit)=>JSON.parse(String(init?.body)).messages[0].content.split(", a ")[0].replace("You are ","");
const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));

test("completed model costs are booked before funding and never charged twice at settlement",async t=>{
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>answer(init));
  requestCycle("steady-yield");await tickFoundation(true);
  let data=foundationData();assert.equal(data.modelCalls.length,8);assert.equal(data.engine.totalNetMicros,-960);assert.equal(data.cycles[0].modelCostMicros,960);
  assert.equal(data.accountingComplete,true);assert.equal(data.reconciled,true);
  await tickFoundation(true);data=foundationData();assert.equal(data.modelCalls.length,9);assert.equal(data.engine.totalNetMicros,-1080);
  await tickFoundation(true);assert.equal(foundationData().cycles[0].phase,"funded");
  await tickFoundation(true);data=foundationData();const receipt=data.cycles[0].evaluation!.receipt!;
  assert.equal(receipt.agentCostMicros,1080);assert.equal(data.engine.totalNetMicros,receipt.netMicros);
  assert.equal(data.engine.cashMicros,initial.engine.initialMicros+receipt.netMicros);
  assert.equal(data.modelCalls.reduce((n,c)=>n+c.accountedCostMicros,0),1080);
  assert.equal(data.distributions[0].profitMicros,receipt.netMicros);assert.equal(data.reconciled,true);assert.equal(data.auditValid,true);
});
test("malformed answers retain billable usage and wait for the other scout to finish",async t=>{
  let release!:(response:Response)=>void;
  const delayed=new Promise<Response>(resolve=>{release=resolve;});
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>nameOf(init)==="Yield scout"?answer(init,{choices:[{message:{content:"not-json"}}]}):delayed);
  requestCycle("steady-yield");let finished=false;
  const result=tickFoundation(true).then(()=>null,error=>{finished=true;return error;});
  await turn();await turn();
  assert.equal(finished,false);assert.equal(foundationData().engine.totalNetMicros,-120);assert.equal(foundationData().accountingComplete,false);
  release(new Response(JSON.stringify({usage:{prompt_tokens:100,completion_tokens:10},choices:[{message:{content:JSON.stringify({venue:"staking",amountUsd:20000,confidence:.8,reason:"A bounded fixture opportunity with acknowledged exit risk."})}}]})));
  assert.ok(await result instanceof Error);
  const data=foundationData();assert.equal(data.engine.totalNetMicros,-240);assert.equal(data.cycles[0].netMicros,-240);
  assert.equal(data.cycles[0].phase,"failed");assert.equal(data.modelCalls.length,2);
  assert.equal(data.accountingComplete,true);assert.equal(data.engine.paused,true);assert.equal(data.reconciled,true);assert.equal(data.auditValid,true);
  configureFoundation({enabled:true});assert.equal((await tickFoundation(true)).worked,false);assert.equal(foundationData().cycles.length,1);
});
test("security failure retains all earlier costs and deploys no capital",async t=>{
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>answer(init,nameOf(init)==="Independent security reviewer"?{choices:[{message:{content:'{"approved":"invalid"}'}}]}:{}));
  requestCycle("steady-yield");await tickFoundation(true);await assert.rejects(tickFoundation(true));
  const data=foundationData();assert.equal(data.engine.totalNetMicros,-1080);assert.equal(data.cycles[0].netMicros,-1080);
  assert.equal(data.engine.reservedMicros,0);assert.equal(data.cycles[0].phase,"failed");assert.equal(data.accountingComplete,true);assert.equal(data.reconciled,true);
});
test("missing usage blocks payouts and requires an evidenced, idempotent reconciliation",async t=>{
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>answer(init,nameOf(init)==="Risk guardian"?{usage:null}:{}));
  requestCycle("steady-yield");await assert.rejects(tickFoundation(true),/token usage/);
  let data=foundationData();const uncertain=data.modelCalls.find(c=>c.status==="uncertain")!;
  assert.equal(data.engine.totalNetMicros,-240);assert.equal(data.engine.paused,true);assert.equal(data.accountingComplete,false);assert.equal(data.reconciled,false);
  assert.equal(payDistributions(),0);assert.throws(()=>pauseFoundation(false),/accounting/);assert.throws(()=>freezeDistribution(),/accounting/);assert.throws(()=>requestCycle("steady-yield"));
  assert.throws(()=>resolveModelCall(uncertain.id,345,""));assert.throws(()=>resolveModelCall(uncertain.id,3.45,"Provider invoice confirmed this cost."));
  resolveModelCall(uncertain.id,345,"Provider invoice fixture confirms 345 microdollars for this request.");
  data=foundationData();assert.equal(data.engine.totalNetMicros,-585);assert.equal(data.cycles[0].netMicros,-585);assert.equal(data.accountingComplete,true);
  assert.equal(data.engine.paused,true);assert.equal(data.reconciled,true);assert.equal(data.auditValid,true);
  assert.throws(()=>resolveModelCall(uncertain.id,345,"Repeated invoice must not debit twice."));assert.equal(foundationData().engine.totalNetMicros,-585);
  pauseFoundation(false);assert.equal(foundationData().engine.paused,false);
});
test("transport timeouts preserve uncertain calls instead of assuming zero-cost failure",async t=>{
  t.mock.method(globalThis,"fetch",async()=>{throw new DOMException("Fixture timeout","TimeoutError");});
  requestCycle("steady-yield");await assert.rejects(tickFoundation(true));
  const data=foundationData();assert.equal(data.modelCalls.length,2);assert.equal(data.unresolvedModelCalls,2);
  assert.equal(data.engine.totalNetMicros,0);assert.equal(data.accountingComplete,false);assert.equal(data.engine.paused,true);
});
test("heartbeats renew the lease throughout a long provider phase",async t=>{
  t.mock.timers.enable({apis:["Date","setInterval"],now:Date.now()});
  const releases:{init?:RequestInit;resolve:(value:Response)=>void}[]=[];
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>releases.length<2?new Promise<Response>(resolve=>{releases.push({init,resolve});}):answer(init));
  requestCycle("steady-yield");const result=tickFoundation(true);await turn();
  const owner=foundationData().engine.leaseOwner;
  for(let elapsed=0;elapsed<WORKER_LEASE_MS*2;elapsed+=WORKER_HEARTBEAT_MS)t.mock.timers.tick(WORKER_HEARTBEAT_MS);
  const during=foundationData();assert.equal(during.engine.leaseOwner,owner);assert.ok(during.engine.leaseUntil>Date.now());
  assert.equal((await tickFoundation(true)).worked,false);
  for(const pending of releases)pending.resolve(answer(pending.init));
  await result;assert.equal(foundationData().cycles[0].phase,"debating");assert.equal(foundationData().accountingComplete,true);
});
test("a stale worker can record late costs but cannot overwrite the recovered cycle",async t=>{
  const releases:{init?:RequestInit;resolve:(value:Response)=>void}[]=[];
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>new Promise<Response>(resolve=>{releases.push({init,resolve});}));
  requestCycle("steady-yield");const old=tickFoundation(true).then(()=>null,error=>error);await turn();
  const state=foundationData().engine;state.leaseUntil=Date.now()-1;
  db().prepare("UPDATE foundation_meta SET payload=? WHERE key='state'").run(JSON.stringify(state));
  await tickFoundation(true);const recovered=foundationData();assert.equal(recovered.cycles[0].phase,"failed");assert.equal(recovered.unresolvedModelCalls,2);
  const history=structuredClone(recovered.cycles[0].history);
  for(const pending of releases)pending.resolve(answer(pending.init));
  assert.ok(await old instanceof Error);
  const data=foundationData();assert.deepEqual(data.cycles[0].history,history);assert.equal(data.engine.totalNetMicros,-240);
  assert.equal(data.cycles[0].netMicros,-240);assert.equal(data.engine.paused,true);assert.equal(data.accountingComplete,true);assert.equal(data.reconciled,true);
});
test("late usage that disagrees with an operator invoice blocks accounting until the discrepancy is resolved",async t=>{
  const releases:{init?:RequestInit;resolve:(value:Response)=>void}[]=[];
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>new Promise<Response>(resolve=>{releases.push({init,resolve});}));
  requestCycle("steady-yield");const old=tickFoundation(true).then(()=>null,error=>error);await turn();
  const state=foundationData().engine;state.leaseUntil=Date.now()-1;
  db().prepare("UPDATE foundation_meta SET payload=? WHERE key='state'").run(JSON.stringify(state));
  await tickFoundation(true);const reconciled=foundationData().modelCalls[0];
  resolveModelCall(reconciled.id,200,"Fixture invoice initially reports 200 microdollars.");
  for(const pending of releases)pending.resolve(answer(pending.init));
  assert.ok(await old instanceof Error);
  let data=foundationData();assert.equal(data.unresolvedModelCalls,1);assert.equal(data.engine.totalNetMicros,-320);assert.equal(data.accountingComplete,false);
  assert.throws(()=>resolveModelCall(reconciled.id,200,"Keep the conflicting original invoice amount."),/observed/);
  resolveModelCall(reconciled.id,120,"Corrected fixture invoice agrees with the returned usage.");
  data=foundationData();assert.equal(data.engine.totalNetMicros,-240);assert.equal(data.cycles[0].netMicros,-240);assert.equal(data.accountingComplete,true);assert.equal(data.auditValid,true);
  assert.throws(()=>resolveModelCall(reconciled.id,120,"Duplicate correction cannot credit the treasury again."));
});
test("an uncovered bill remains visible and blocks accounting without making cash negative",async t=>{
  t.mock.method(globalThis,"fetch",async(_url:unknown,init?:RequestInit)=>answer(init,{usage:{prompt_tokens:initial.engine.cashMicros+1,completion_tokens:10}}));
  requestCycle("steady-yield");await assert.rejects(tickFoundation(true),/cannot be covered/);
  const data=foundationData();assert.equal(data.engine.cashMicros,initial.engine.cashMicros);assert.equal(data.accountingComplete,false);
  assert.equal(data.engine.paused,true);assert.ok(data.modelCalls.every(c=>c.record!.costMicros>data.engine.cashMicros));
  assert.throws(()=>resolveModelCall(data.modelCalls[0].id,1,"A bill cannot silently be reduced to one microdollar."),/observed/);
});
test("an abrupt provider worker exit is recovered in fresh processes without resending its request",()=>{
  const path=join(mkdtempSync(join(tmpdir(),"greed-provider-restart-")),"foundation.sqlite");
  function processStep(step:string,expected=0):FoundationData|undefined{
    const script=`import { configureFoundation,foundationData,requestCycle,tickFoundation,resolveModelCall,pauseFoundation } from './src/lib/foundation/store.ts';
      import { db } from './src/lib/database.ts';${step};console.log(JSON.stringify(foundationData()));`;
    const result=spawnSync(process.execPath,["--import","tsx","--input-type=module","--eval",script],{cwd:process.cwd(),env:{...process.env,GREED_DB_PATH:path},encoding:"utf8",timeout:20000});
    assert.equal(result.status,expected,result.stderr||result.error?.message||"Provider worker failed.");
    return expected===0?JSON.parse(result.stdout):undefined;
  }
  processStep("configureFoundation({agentMode:'model'});requestCycle('steady-yield');globalThis.fetch=async()=>process.exit(7);await tickFoundation(true)",7);
  let data=processStep(`const state=foundationData().engine;state.leaseUntil=Date.now()-1;db().prepare("UPDATE foundation_meta SET payload=? WHERE key='state'").run(JSON.stringify(state));await tickFoundation(true)`)!;
  assert.equal(data.cycles[0].phase,"failed");assert.equal(data.modelCalls.length,1);assert.equal(data.unresolvedModelCalls,1);assert.equal(data.engine.paused,true);
  const callId=data.modelCalls[0].id;
  data=processStep(`resolveModelCall('${callId}',12345,'Fixture invoice confirms the interrupted request charge.');pauseFoundation(false);await tickFoundation(true)`)!;
  assert.equal(data.modelCalls.length,1);assert.equal(data.engine.totalNetMicros,-12345);assert.equal(data.cycles[0].netMicros,-12345);
  assert.equal(data.accountingComplete,true);assert.equal(data.reconciled,true);assert.equal(data.auditValid,true);
});
test("a crash after usage booking retains its cost and does not replay the unfinished phase",()=>{
  const path=join(mkdtempSync(join(tmpdir(),"greed-accounted-restart-")),"foundation.sqlite");
  function processStep(step:string,expected=0):FoundationData|undefined{
    const script=`import { configureFoundation,foundationData,requestCycle,tickFoundation } from './src/lib/foundation/store.ts';import { db } from './src/lib/database.ts';${step};console.log(JSON.stringify(foundationData()));`;
    const result=spawnSync(process.execPath,["--import","tsx","--input-type=module","--eval",script],{cwd:process.cwd(),env:{...process.env,GREED_DB_PATH:path},encoding:"utf8",timeout:20000});
    assert.equal(result.status,expected,result.stderr||result.error?.message||"Provider worker failed.");return expected===0?JSON.parse(result.stdout):undefined;
  }
  processStep(`configureFoundation({agentMode:'model'});requestCycle('steady-yield');globalThis.fetch=async()=>({ok:true,json:async()=>({usage:{prompt_tokens:100,completion_tokens:10},get choices(){process.exit(7);}})});await tickFoundation(true)`,7);
  const data=processStep(`const state=foundationData().engine;state.leaseUntil=Date.now()-1;db().prepare("UPDATE foundation_meta SET payload=? WHERE key='state'").run(JSON.stringify(state));await tickFoundation(true)`)!;
  assert.equal(data.cycles[0].phase,"failed");assert.equal(data.modelCalls.length,2);assert.equal(data.modelCalls.filter(c=>c.status==="failed").length,1);
  assert.equal(data.engine.totalNetMicros,-120);assert.equal(data.cycles[0].netMicros,-120);assert.equal(data.engine.paused,true);assert.equal(data.unresolvedModelCalls,1);
  const uncertain=data.modelCalls.find(c=>c.status==="uncertain")!;
  const after=processStep(`const { resolveModelCall,pauseFoundation }=await import('./src/lib/foundation/store.ts');resolveModelCall('${uncertain.id}',120,'Fixture invoice confirms the parallel scout cost.');pauseFoundation(false);await tickFoundation(true)`)!;
  assert.equal(after.modelCalls.length,2);assert.equal(after.engine.totalNetMicros,-240);assert.equal(after.accountingComplete,true);assert.equal(after.reconciled,true);
});
