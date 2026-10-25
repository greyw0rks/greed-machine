import { createHash, randomUUID } from "node:crypto";
import { db, transaction } from "../database";
import { SCENARIOS, GENESIS_MANDATE } from "../scenarios";
import { settle } from "../accounting";
import { evaluatePolicy } from "../policy";
import { allocateEntitlements, fixtureReceipt, profitSplit, validateRecipients } from "./distributions";
import { scout, debate, review } from "./swarm";
import { modelCall, type ModelCaller } from "../agents";
import { z } from "zod";
import type { AgentRecord } from "../types";
import type { Cycle, Distribution, EngineState, FoundationConfig, FoundationData, FoundationEvent, ModelCallEntry } from "./types";

export const WORKER_LEASE_MS=300000;
export const WORKER_HEARTBEAT_MS=15000;

let initialized=false;
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function init(){
  if(initialized)return;
  db().exec(`CREATE TABLE IF NOT EXISTS foundation_meta(key TEXT PRIMARY KEY,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS foundation_cycles(id TEXT PRIMARY KEY,sequence INTEGER UNIQUE NOT NULL,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS foundation_distributions(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS foundation_events(id INTEGER PRIMARY KEY AUTOINCREMENT,payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS foundation_model_calls(id TEXT PRIMARY KEY,cycle_id TEXT NOT NULL REFERENCES foundation_cycles(id),payload TEXT NOT NULL);`);
  initialized=true;
  transaction(()=>{
    if(!db().prepare("SELECT key FROM foundation_meta WHERE key='state'").get()){
      put("state",{initialMicros:100_000e6,cashMicros:100_000e6,reservedMicros:0,totalNetMicros:0,profitWatermarkMicros:0,distributedMicros:0,retainedMicros:0,sequence:0,nextRunAt:0,paused:false,heartbeatAt:null,leaseOwner:null,leaseUntil:0} satisfies EngineState);
      put("config",{enabled:false,intervalMs:10000,holderBps:6500,agentMode:"simulation",recipients:[{id:"fixture.ada",name:"Holder A",weight:"250000"},{id:"fixture.kai",name:"Holder B",weight:"400000"},{id:"fixture.noa",name:"Holder C",weight:"350000"}],blockedRecipients:[]} satisfies FoundationConfig);
      event("treasury","Foundation initialized","100,000 synthetic USDC seeded. Token and launchpad integrations are deferred.",{principalMicros:100_000e6});
    }
  });
}
function get<T>(key:string):T{return JSON.parse((db().prepare("SELECT payload FROM foundation_meta WHERE key=?").get(key) as {payload:string}).payload);}
function put(key:string,value:unknown){db().prepare("INSERT INTO foundation_meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload").run(key,JSON.stringify(value));}
function cycles():Cycle[]{return (db().prepare("SELECT payload FROM foundation_cycles ORDER BY sequence DESC").all() as {payload:string}[]).map(r=>JSON.parse(r.payload));}
function periods():Distribution[]{return (db().prepare("SELECT payload FROM foundation_distributions ORDER BY rowid DESC").all() as {payload:string}[]).map(r=>JSON.parse(r.payload));}
function saveCycle(c:Cycle){db().prepare("INSERT INTO foundation_cycles VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(c.id,c.sequence,JSON.stringify(c));}
function savePeriod(p:Distribution){db().prepare("INSERT INTO foundation_distributions VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(p.id,JSON.stringify(p));}
function modelCalls():ModelCallEntry[]{return (db().prepare("SELECT payload FROM foundation_model_calls ORDER BY rowid DESC").all() as {payload:string}[]).map(r=>JSON.parse(r.payload));}
function saveCall(c:ModelCallEntry){db().prepare("INSERT INTO foundation_model_calls VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(c.id,c.cycleId,JSON.stringify(c));}
function callById(id:string){const c=modelCalls().find(c=>c.id===id);if(!c)throw new Error("Unknown provider call.");return c;}
function cycleById(id:string){const c=cycles().find(c=>c.id===id);if(!c)throw new Error("Unknown cycle.");return c;}
const unresolved=(c:ModelCallEntry)=>["inflight","accounted","uncertain"].includes(c.status);
function assertAccounting(){if(modelCalls().some(unresolved))throw new Error("Provider accounting is incomplete. Resolve pending or uncertain calls before committing capital or payouts.");}
function assertLease(s:EngineState,owner:string){if(s.leaseOwner!==owner||s.leaseUntil<=Date.now())throw new Error("Worker lease expired or changed; no further phase commits are allowed.");}
function event(kind:string,subject:string,detail:string,evidence:unknown){
  const row=db().prepare("SELECT payload FROM foundation_events ORDER BY id DESC LIMIT 1").get() as {payload:string}|undefined;
  const payload={time:Date.now(),kind,subject,detail,evidence,previousHash:row?JSON.parse(row.payload).hash:"genesis"};
  db().prepare("INSERT INTO foundation_events(payload) VALUES (?)").run(JSON.stringify({...payload,hash:hash(payload)}));
}
function pending(){return periods().flatMap(p=>p.entitlements).filter(e=>e.status!=="paid").reduce((n,e)=>n+e.amountMicros,0);}
function available(s:EngineState){return Math.max(0,s.cashMicros-pending());}
// The initial principal fixes the liquid reserve; losses must not shrink that floor.
function reserveFloor(s:EngineState){return Number((BigInt(s.initialMicros)+3n)/4n);}
const terminal=(c:Cycle)=>["settled","blocked","failed"].includes(c.phase);
function advance(c:Cycle,phase:Cycle["phase"],detail:string){c.phase=phase;c.updatedAt=Date.now();c.history.push({phase,time:c.updatedAt,detail});event(phase,c.scenarioName,detail,{cycleId:c.id});saveCycle(c);}

export function foundationData():FoundationData{
  init();const engine=get<EngineState>("state"),config=get<FoundationConfig>("config");
  const events=(db().prepare("SELECT id,payload FROM foundation_events ORDER BY id ASC").all() as {id:number;payload:string}[]).map(r=>({id:r.id,...JSON.parse(r.payload)})) as FoundationEvent[];
  let previous="genesis",valid=true;
  for(const e of events){const {id:_id,hash:stored,...payload}=e;if(payload.previousHash!==previous||hash(payload)!==stored)valid=false;previous=stored;}
  const calls=modelCalls(),unresolvedModelCalls=calls.filter(unresolved).length,accountingComplete=unresolvedModelCalls===0;
  return {environment:"foundation simulation",engine,config,cycles:cycles().slice(0,100),distributions:periods().slice(0,100),events:events.reverse().slice(0,200),auditValid:valid,reconciled:accountingComplete&&engine.cashMicros+engine.reservedMicros===engine.initialMicros+engine.totalNetMicros-engine.distributedMicros,pendingMicros:pending(),availableMicros:available(engine),modelCalls:calls.slice(0,1000),accountingComplete,unresolvedModelCalls,modelConfigured:Boolean(process.env.OPENAI_API_KEY),scenarios:SCENARIOS.map(({id,name,description})=>({id,name,description}))};
}
export function configureFoundation(change:Partial<FoundationConfig>){
  init();return transaction(()=>{
    const config={...get<FoundationConfig>("config"),...change};
    if(!Number.isInteger(config.holderBps)||config.holderBps<6000||config.holderBps>7000)throw new Error("Holder share must stay between 60% and 70%.");
    if(!Number.isInteger(config.intervalMs)||config.intervalMs<1000||config.intervalMs>3600000)throw new Error("Cycle interval must be 1 second to 1 hour.");
    if(!["simulation","model"].includes(config.agentMode)||config.agentMode==="model"&&!process.env.OPENAI_API_KEY)throw new Error("Model agents need a configured provider.");
    config.recipients=validateRecipients(config.recipients);
    if(!config.blockedRecipients.every(id=>config.recipients.some(r=>r.id===id)))throw new Error("Unknown blocked fixture recipient.");
    put("config",config);event("configuration","Foundation settings","Simulation policy updated; existing distribution snapshots remain immutable.",config);return config;
  });
}
export function pauseFoundation(paused:boolean){init();transaction(()=>{if(!paused)assertAccounting();const s=get<EngineState>("state");s.paused=paused;put("state",s);event("security","Guardian pause",paused?"New allocations and payouts paused. Existing positions may settle safely.":"Foundation operations resumed.",{paused});});}
function start(s:EngineState,scenarioId:string):Cycle{
  const scenario=SCENARIOS.find(x=>x.id===scenarioId);if(!scenario)throw new Error("Unknown foundation scenario.");
  if(s.paused)throw new Error("Foundation is paused.");
  assertAccounting();
  if(cycles().some(c=>!terminal(c)))throw new Error("A cycle is already active.");
  s.sequence++;const now=Date.now();
  const c:Cycle={id:randomUUID(),sequence:s.sequence,scenarioId,scenarioName:scenario.name,phase:"scouting",createdAt:now,updatedAt:now,startingEquityMicros:s.cashMicros+s.reservedMicros,reservedMicros:0,modelCostMicros:0,agentMode:get<FoundationConfig>("config").agentMode,debate:[],netMicros:null,history:[{phase:"scouting",time:now,detail:"Scouts are preparing independent proposals from the scenario fixture."}]};
  saveCycle(c);event("scouting",c.scenarioName,"Independent scouts started; no capital authorized.",{cycleId:c.id});return c;
}
export function requestCycle(scenarioId:string){init();return transaction(()=>{const s=get<EngineState>("state");const c=start(s,scenarioId);s.nextRunAt=0;put("state",s);return c;});}
function bookProfit(s:EngineState,config:FoundationConfig){
  if(modelCalls().some(unresolved))return;
  const split=profitSplit(s.totalNetMicros,s.profitWatermarkMicros,config.holderBps);
  if(split.profitMicros===0||split.holderMicros===0)return;
  if(available(s)-split.holderMicros<reserveFloor(s))return;
  const recipients=validateRecipients(config.recipients),snapshot={source:"foundation fixture" as const,hash:hash(recipients),recipients};
  const p:Distribution={id:randomUUID(),createdAt:Date.now(),...split,holderBps:config.holderBps,snapshot,status:"pending",entitlements:allocateEntitlements(split.holderMicros,recipients)};
  s.profitWatermarkMicros=s.totalNetMicros;s.retainedMicros+=split.retainedMicros;savePeriod(p);
  event("distribution","Profit allocated","Realized profit split into protected holder liabilities and retained treasury earnings.",{periodId:p.id,...split,snapshot});
}
export function freezeDistribution(){init();transaction(()=>{assertAccounting();const s=get<EngineState>("state");if(s.paused)throw new Error("Foundation is paused.");bookProfit(s,get("config"));put("state",s);});}
export function payDistributions(limit=25){
  init();if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error("Invalid payout batch limit.");
  return transaction(()=>{
    const s=get<EngineState>("state"),config=get<FoundationConfig>("config");if(s.paused||modelCalls().some(unresolved))return 0;
    let processed=0;
    const all=periods().reverse();
    // Give less-attempted entitlements a turn before retrying unavailable receivers.
    const queue=all.flatMap(p=>p.entitlements.filter(e=>e.status!=="paid").map(e=>({p,e})))
      .sort((a,b)=>a.e.attempts-b.e.attempts).slice(0,limit);
    for(const {p,e} of queue){
        e.attempts++;processed++;
        if(config.blockedRecipients.includes(e.recipientId)) {e.status="failed";e.error="Fixture receiver unavailable; entitlement remains reserved.";}
        else if(available(s)<reserveFloor(s)) {e.status="failed";e.error="Reserve floor prevents this payout; entitlement remains reserved.";}
        else {
          e.status="paid";e.error=null;e.receipt=fixtureReceipt(p.id,e.recipientId,e.amountMicros);s.cashMicros-=e.amountMicros;s.distributedMicros+=e.amountMicros;
        }
        // Persist the entitlement before the next solvency check reads liabilities.
        savePeriod(p);
        event(e.status==="paid"?"payout":"payout-failed",e.name,e.error||"Simulated USDC payout recorded once. No on-chain transfer.",{periodId:p.id,...e});
    }
    for(const p of all){
      p.status=p.entitlements.every(e=>e.status==="paid")?"complete":"pending";savePeriod(p);
    }
    put("state",s);return processed;
  });
}
function close(c:Cycle,s:EngineState,approved:boolean){
  const e=c.evaluation!,scenario=SCENARIOS.find(x=>x.id===c.scenarioId)!;
  const agentCost=e.agents.reduce((n,a)=>n+a.costMicros,0)+(c.security?.costMicros||0);
  const receipt=settle(e.selected,scenario,{allowed:approved,checks:c.security?.checks||[]},agentCost,`sim:${c.id}`);
  if(receipt.capitalMicros!==c.reservedMicros)throw new Error("Position reservation does not match the settlement receipt.");
  const prepaid=c.modelCostMicros||0;
  if(prepaid>agentCost)throw new Error("Provider journal costs exceed the settlement's analysis costs.");
  s.cashMicros+=receipt.proceedsMicros-receipt.transactionCostMicros-receipt.slippageMicros-receipt.agentCostMicros+prepaid;
  s.reservedMicros-=c.reservedMicros;s.totalNetMicros+=receipt.netMicros+prepaid;c.netMicros=receipt.netMicros;c.reservedMicros=0;e.receipt=receipt;
  if(!Number.isSafeInteger(s.cashMicros)||s.cashMicros<0)throw new Error("Settlement would make the synthetic treasury invalid.");
  advance(c,approved?"settled":"blocked",approved?"Position settled. Principal, realized result and all costs reconciled.":"Funding blocked. Only analytical costs were charged.");
  event("receipt",c.scenarioName,"Independent integer-microdollar settlement receipt.",{cycleId:c.id,receipt});
  if(!s.paused)bookProfit(s,get("config"));
}
function chargeCall(s:EngineState,c:Cycle,entry:ModelCallEntry,costMicros:number){
  const delta=costMicros-entry.accountedCostMicros;
  const cash=s.cashMicros-delta,net=s.totalNetMicros-delta,total=(c.modelCostMicros||0)+delta;
  if(![cash,net,total].every(Number.isSafeInteger)||cash<0||total<0)throw new Error("Provider expense cannot be covered by the synthetic treasury; reconciliation is required.");
  s.cashMicros=cash;s.totalNetMicros=net;c.modelCostMicros=total;entry.accountedCostMicros=costMicros;
  if(c.phase==="failed")c.netMicros=-total;
  if(available(s)<reserveFloor(s))s.paused=true;
  saveCycle(c);put("state",s);
  event("provider-cost",entry.name,"Provider expense booked once from usage or documented reconciliation. Settlement will not charge it again.",{callId:entry.id,cycleId:c.id,deltaMicros:delta,costMicros});
}
export function resolveModelCall(callId:string,costMicros:number,evidence:string){
  init();return transaction(()=>{
    const entry=callById(callId),s=get<EngineState>("state");
    if(entry.status!=="uncertain")throw new Error("Only an uncertain provider call can be reconciled.");
    if(s.leaseOwner===entry.leaseOwner&&s.leaseUntil>Date.now())throw new Error("The originating worker is still active. Wait for it to finish before reconciling.");
    if(!Number.isSafeInteger(costMicros)||costMicros<0||typeof evidence!=="string"||evidence.trim().length<10||evidence.length>2000)throw new Error("Reconciliation needs integer microdollars and supporting evidence.");
    if(entry.record&&entry.record.costMicros!==costMicros)throw new Error("Reconciled cost must match the observed provider usage.");
    chargeCall(s,cycleById(entry.cycleId),entry,costMicros);
    entry.status="resolved";entry.resolution=evidence.trim();entry.finishedAt=Date.now();entry.error=null;saveCall(entry);
    event("provider-resolution",entry.name,"An operator reconciled the uncertain call. Operations remain paused until explicitly resumed.",{callId,costMicros,evidence:entry.resolution});
    return entry;
  });
}
function recoverProviderCalls(s:EngineState){
  const calls=modelCalls();
  for(const entry of calls.filter(e=>["inflight","accounted"].includes(e.status))){
    entry.status=entry.record?"failed":"uncertain";entry.error=entry.record?"Worker interrupted after usage was booked.":"Worker interrupted before provider usage was verified.";entry.finishedAt=Date.now();
    if(entry.status==="uncertain")s.paused=true;
    saveCall(entry);event("provider-recovery",entry.name,entry.error,{callId:entry.id,cycleId:entry.cycleId,status:entry.status});
  }
  // Even fully returned calls must not be sent again if their phase never committed.
  for(const c of cycles().filter(c=>!terminal(c)&&c.phase!=="funded"&&calls.some(e=>e.cycleId===c.id&&e.phase===c.phase))){
    s.paused=true;
    c.error="Interrupted provider phase closed without replaying paid calls.";c.netMicros=-(c.modelCostMicros||0);advance(c,"failed",c.error);
  }
}
function providerCaller(cycleId:string,owner:string,signal:AbortSignal,renew:()=>void):ModelCaller{
  return async(name,role,input,schema)=>{
    // Validate configuration before recording a potentially sent request.
    if(!process.env.OPENAI_API_KEY)throw new Error("Configure OPENAI_API_KEY to use model agents.");
    const inputPrice=Number(process.env.OPENAI_INPUT_USD_PER_MILLION??.4),outputPrice=Number(process.env.OPENAI_OUTPUT_USD_PER_MILLION??1.6);
    if(![inputPrice,outputPrice].every(p=>Number.isFinite(p)&&p>=0))throw new Error("Configure valid model token prices.");
    renew();signal.throwIfAborted();
    const entry=transaction(()=>{
      const s=get<EngineState>("state"),c=cycleById(cycleId);assertLease(s,owner);
      if(s.paused||terminal(c)||available(s)<=reserveFloor(s))throw new Error("Provider calls cannot start while operations are paused or liquid reserves are exhausted.");
      const entry:ModelCallEntry={id:randomUUID(),cycleId,phase:c.phase,leaseOwner:owner,name,role,requestHash:hash({name,role,input,schema:z.toJSONSchema(schema),model:process.env.OPENAI_MODEL||"gpt-4.1-mini",provider:process.env.OPENAI_BASE_URL||"https://api.openai.com/v1",inputPrice,outputPrice}),inputPrice,outputPrice,startedAt:Date.now(),finishedAt:null,status:"inflight",accountedCostMicros:0,record:null,responseId:null,error:null,resolution:null};
      saveCall(entry);event("provider-start",name,"Provider request committed before dispatch; interrupted requests will require recovery.",{callId:entry.id,cycleId,requestHash:entry.requestHash});return entry;
    });
    let observed:AgentRecord|undefined;
    try{
      const result=await modelCall(name,role,input,schema,{signal,onUsage:(record,responseId)=>{
        observed=record;
        // Financial evidence remains recordable after lease loss; it never authorizes a phase commit.
        transaction(()=>{
          const current=callById(entry.id),s=get<EngineState>("state");
          const conflict=(current.status==="resolved"||current.record!==null)&&current.accountedCostMicros!==record.costMicros;
          current.record=record;current.responseId=responseId;
          if(conflict){current.status="uncertain";current.error="Provider usage conflicts with an earlier reconciliation.";s.paused=true;put("state",s);}
          else {if(current.status!=="resolved")chargeCall(s,cycleById(cycleId),current,record.costMicros);current.status=current.status==="resolved"?"resolved":"accounted";}
          saveCall(current);
        });
      }});
      transaction(()=>{
        const current=callById(entry.id);
        if(current.status==="uncertain")throw new Error("Provider usage requires reconciliation before this result can be used.");
        current.record=result.record;current.status=current.status==="resolved"?"resolved":"complete";current.finishedAt=Date.now();saveCall(current);
        event("provider-complete",name,"Provider answer validated; usage and cost remain in the durable journal.",{callId:entry.id,record:result.record});
      });
      renew();return result;
    }catch(error){
      transaction(()=>{
        const current=callById(entry.id),s=get<EngineState>("state");
        if(["complete","resolved"].includes(current.status))return;
        current.record=current.record||observed||null;
        const known=current.record!==null&&current.accountedCostMicros===current.record.costMicros;
        current.status=known?"failed":"uncertain";current.finishedAt=Date.now();
        current.error=error instanceof Error?error.message:"Provider call failed";
        if(!known){s.paused=true;put("state",s);}
        saveCall(current);event("provider-failed",name,known?"Answer failed; recorded provider cost remains charged.":"Provider cost is uncertain. New allocations and payouts are blocked.",{callId:entry.id,status:current.status,error:current.error});
      });
      throw error;
    }
  };
}
export async function tickFoundation(force=false){
  init();const owner=randomUUID();
  const acquired=transaction(()=>{const s=get<EngineState>("state"),now=Date.now();if(s.leaseUntil>now)return false;recoverProviderCalls(s);s.leaseOwner=owner;s.leaseUntil=now+WORKER_LEASE_MS;s.heartbeatAt=now;put("state",s);return true;});
  if(!acquired)return {worked:false,reason:"Another worker holds the lease."};
  const controller=new AbortController();let cycle:Cycle|undefined;
  const renew=()=>transaction(()=>{const s=get<EngineState>("state");assertLease(s,owner);s.leaseUntil=Date.now()+WORKER_LEASE_MS;s.heartbeatAt=Date.now();put("state",s);});
  const pulse=setInterval(()=>{try{renew();}catch(error){controller.abort(error);}},WORKER_HEARTBEAT_MS);pulse.unref?.();
  const commit=(fn:(s:EngineState)=>void)=>transaction(()=>{const s=get<EngineState>("state");assertLease(s,owner);if(cycle)cycle.modelCostMicros=cycleById(cycle.id).modelCostMicros;fn(s);s.nextRunAt=Date.now()+get<FoundationConfig>("config").intervalMs;put("state",s);});
  try{
    const s=get<EngineState>("state"),config=get<FoundationConfig>("config");
    let c=cycles().find(c=>!terminal(c));
    if(!force&&s.nextRunAt>Date.now())return {worked:false,reason:"Waiting for next phase."};
    if(s.paused&&c?.phase!=="funded")return {worked:false,reason:"Guardian pause."};
    if(!c){if(!config.enabled)return {worked:false,reason:"Automatic cycles are off."};commit(state=>{start(state,SCENARIOS[state.sequence%SCENARIOS.length].id);});return {worked:true,phase:"scouting"};}
    cycle=c;const current=c,scenario=SCENARIOS.find(x=>x.id===c.scenarioId)!;
    const call=providerCaller(c.id,owner,controller.signal,renew);
    if(c.phase==="scouting"){
      const evaluation=await scout(scenario,available(s),c.agentMode||config.agentMode,call);
      const discussion=await debate(evaluation,scenario,call);
      evaluation.selected.expiresAt=Date.now()+300000;
      commit(()=>{current.evaluation=evaluation;current.debate=discussion;advance(current,"debating","Competing proposals and adversarial responses recorded; selection is not authorization.");});
    }else if(c.phase==="debating"){
      const security=await review(c.evaluation!,scenario,available(s),s.paused,call);
      commit(()=>{current.security=security;advance(current,"security",security.approved?"Independent security review passed. Exact action awaits final funding checks.":"Security review refused funding. The refusal is ready for accounting.");});
    }else if(c.phase==="security"){
      commit(state=>{
        assertAccounting();
        const e=current.evaluation!;
        const executed=new Set(cycles().filter(c=>c.id!==current.id&&(c.phase==="funded"||c.evaluation?.receipt?.capitalMicros)).map(c=>c.evaluation!.selected.id));
        const recheck=evaluatePolicy(e.selected,{...GENESIS_MANDATE,paused:state.paused},available(state),scenario,executed);
        const projected=settle(e.selected,scenario,recheck,e.agents.reduce((n,a)=>n+a.costMicros,0)+(current.security?.costMicros||0),`sim:${current.id}`);
        const costs=projected.transactionCostMicros+projected.slippageMicros+projected.agentCostMicros-(current.modelCostMicros||0);
        recheck.checks.push({rule:"Fixed liquid reserve",passed:available(state)-e.selected.amountMicros-costs>=reserveFloor(state),evidence:"Unpaid holder liabilities, 25% of initial principal and known execution/analysis costs must remain protected."});
        recheck.allowed=recheck.checks.every(c=>c.passed);
        current.security!.checks.push({rule:"Funding-time recheck",passed:recheck.allowed,evidence:recheck.checks.filter(x=>!x.passed).map(x=>x.rule).join(", ")||"Passed"});
        if(!current.security?.approved||!recheck.allowed){
          current.security!.approved=false;
          if(!recheck.allowed)current.security!.assessment=`Funding refused at the final recheck: ${recheck.checks.filter(c=>!c.passed).map(c=>c.rule).join(", ")}.`;
          close(current,state,false);return;
        }
        const amount=e.selected.amountMicros;
        state.cashMicros-=amount;state.reservedMicros+=amount;current.reservedMicros=amount;
        advance(current,"funded",amount>0?"Bounded capital reserved in the simulation adapter; position is being monitored.":"Reserve selected. No capital deployed; analytical costs still settle.");
      });
    }else if(c.phase==="funded")commit(state=>close(current,state,true));
    return {worked:true,phase:current.phase};
  }catch(error){
    transaction(()=>{const s=get<EngineState>("state");if(s.leaseOwner!==owner||s.leaseUntil<=Date.now())return;const c=cycles().find(x=>x.id===cycle?.id&&!terminal(x));if(c&&c.phase!=="funded"){c.error=error instanceof Error?error.message:"Worker step failed";c.netMicros=-(c.modelCostMicros||0);if((c.agentMode||c.evaluation?.agentMode)==="model")s.paused=true;s.nextRunAt=Date.now()+get<FoundationConfig>("config").intervalMs;put("state",s);advance(c,"failed",c.error);}event("error","Worker step",error instanceof Error?error.message:"Unknown error",{});});
    throw error;
  }finally{
    clearInterval(pulse);
    transaction(()=>{const s=get<EngineState>("state");if(s.leaseOwner===owner&&s.leaseUntil>Date.now()){s.leaseOwner=null;s.leaseUntil=0;put("state",s);}});
  }
}
