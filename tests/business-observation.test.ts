import test from "node:test";
import assert from "node:assert/strict";
import { GovernanceRpc } from "../src/lib/near-governance";
import { observeBusiness,type BusinessReport } from "../src/lib/business/report";

const hash="2".repeat(32),code="3".repeat(32),snapshot="a".repeat(64);
const state={schema_version:1 as const,environment:"testnet-demo-token" as const,token:"dollar.testnet",vault:"vault.testnet",sponsor:"sponsor.testnet",operator:"operator.testnet",guardian:"guardian.testnet",expense_receiver:"provider.testnet",roster:["alice.testnet"],cash:"1004550000",principal:"1000000000",reserved:"0",net:"13000000",watermark:"13000000",paid:"8450000",liabilities:"0",expense_pending:"0",expense_budget_used:"0",expense_budget:"10000000" as const,reserve_floor:"250000000",max_spend:"100000000" as const,holder_bps:6500 as const,cadence_ns:"60000000000",next_distribution_ns:"1",paused:false,active:null,period_count:1};
const period={id:0,snapshot_hash:snapshot,holders:[{account_id:"alice.testnet",weight:"1000000"}],profit:"13000000",holder_amount:"8450000",retained:"4550000",entitlements:[{account_id:"alice.testnet",amount:"8450000",status:"PAID" as const,attempts:1}]};
const report:BusinessReport={completed:true,environment:"testnet",verifiedAt:new Date().toISOString(),limits:"test fixture",accounts:{treasury:"treasury.testnet",vault:"vault.testnet",dollar:"dollar.testnet",token:"token.testnet"},contracts:Object.fromEntries(["treasury","vault","dollar","token"].map(r=>[r,{codeHash:code,wasmSha256:"b".repeat(64)}])),reports:[{name:"fixture",passed:true}],finalState:state,period,transactions:[],snapshot:{tokenAccount:"token.testnet",codeHash:code,blockHash:hash,blockHeight:10,totalSupply:"1000000",source:"reconstructed NEP-141 receipts",eventHash:"c".repeat(64),holders:period.holders,hash:snapshot},decision:{agentMode:"fixture",debate:[],security:{approved:true,checks:[]}}};
function rpcFixture(change:{code?:string;balance?:string;period?:typeof period;timestamp?:number}={}){
  const requests:Record<string,unknown>[]=[];
  const request:typeof fetch=async(_url,init)=>{
    const body=JSON.parse(String(init?.body)),p=body.params;let result:unknown;
    if(body.method==="status")result={chain_id:"testnet",sync_info:{syncing:false}};
    else if(body.method==="block")result={header:{hash,height:10,timestamp_nanosec:String(BigInt(change.timestamp??Date.now())*1_000_000n)}};
    else if(body.method==="query"){
      requests.push(p);
      if(p.request_type==="view_account")result={block_hash:hash,code_hash:change.code??code};
      else {const args=JSON.parse(Buffer.from(p.args_base64,"base64").toString());const value=p.method_name==="get_state"?state:p.method_name==="get_period"?(assert.equal(args.period_id,0),change.period??period):p.method_name==="ft_metadata"?{symbol:"gUSD",decimals:6}:args.account_id==="treasury.testnet"?(change.balance??state.cash):"8450000";result={block_hash:hash,result:[...Buffer.from(JSON.stringify(value))]};}
    }
    else throw new Error("Unexpected request");return Response.json({result});
  };
  return {rpc:new GovernanceRpc("https://fixture.invalid",request),requests};
}
test("business observation pins every contract and balance to the same finalized block",async()=>{
  const f=rpcFixture(),observed=await observeBusiness(report,f.rpc);assert.equal(observed.reconciled,true);assert.equal(observed.treasuryTokenBalance,state.cash);assert.ok(f.requests.every(r=>r.block_id===hash));
});
test("Sandbox reports cannot be promoted to public testnet verification",async()=>{
  const f=rpcFixture();await assert.rejects(observeBusiness({...report,environment:"local-near-sandbox"},f.rpc),/Sandbox/);assert.equal(f.requests.length,0);
});
test("wrong deployed builds, stale blocks and altered snapshot commitments fail closed",async()=>{
  await assert.rejects(observeBusiness(report,rpcFixture({code:"4".repeat(32)}).rpc),/differs/);
  await assert.rejects(observeBusiness(report,rpcFixture({timestamp:Date.now()-180000}).rpc),/stale/);
  await assert.rejects(observeBusiness(report,rpcFixture({period:{...period,snapshot_hash:"d".repeat(64)}}).rpc),/binding changed/);
});
test("a successful RPC read cannot hide missing treasury tokens or invalid allocations",async()=>{
  assert.equal((await observeBusiness(report,rpcFixture({balance:"1004549999"}).rpc)).reconciled,false);
  assert.equal((await observeBusiness(report,rpcFixture({period:{...period,retained:"4550001"}}).rpc)).reconciled,false);
});
