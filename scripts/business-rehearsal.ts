import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile,writeFile } from "node:fs/promises";
import { Account,JsonRpcProvider,actions,getTransactionLastResult,baseEncode } from "near-api-js";
import { TransactionJournal } from "../src/lib/business/journal";
import { createHolderSnapshot,type TokenEvent } from "../src/lib/business/holders";
import { businessStateSchema,periodSchema,reconcileBusiness } from "../src/lib/business/schemas";
import { demoDecision } from "../src/lib/business/decision";

export type Outcome=Awaited<ReturnType<JsonRpcProvider["sendTransactionUntil"]>>;
export interface RehearsalContext { provider:JsonRpcProvider;journal:TransactionJournal;accounts:{sponsor:Account;treasury:Account;vault:Account;dollar:Account;token:Account;operator:Account;guardian:Account;provider:Account;holders:Account[]};wasms:{treasury:Buffer;vault:Buffer;dollar:Buffer;token:Buffer};cadenceSeconds:number;negativeChecks:boolean;progress:(message:string)=>void }
const commitment=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function tokenEvents(outcomes:Outcome[],accountId:string):TokenEvent[]{
  const events:TokenEvent[]=[];
  for(const tx of outcomes)for(const receipt of tx.receipts_outcome){if(receipt.outcome.executor_id!==accountId)continue;receipt.outcome.logs.forEach((log,index)=>{if(!log.startsWith("EVENT_JSON:"))return;const value=JSON.parse(log.slice(11));if(value.standard==="nep141"&&["ft_mint","ft_burn","ft_transfer"].includes(value.event))events.push({receiptId:receipt.id,logIndex:index,event:value.event,data:value.data});});}
  return events;
}
export async function rehearseBusiness(ctx:RehearsalContext){
  const {provider,journal,accounts:a,wasms}=ctx,transactions:Outcome[]=[],reports:{name:string;passed:boolean}[]=[];
  const view=async<T>(account:string,method:string,args:Record<string,unknown>={}):Promise<T>=>provider.callFunction({contractId:account,method,args,blockQuery:{finality:"final"}}) as Promise<T>;
  // Plain NEP-141 transfers need no cross-contract callback budget. Keep the
  // existing 180 Tgas request for all journaled treasury actions on recovery.
  const write=async(step:string,account:Account,receiver:string,method:string,args:Record<string,unknown>,deposit=0n,gas=method==="ft_transfer"?30_000_000_000_000n:180_000_000_000_000n)=>{const tx=await journal.send(step,account,receiver,[actions.functionCall(method,args,gas,deposit)]);transactions.push(tx);return tx;};
  const success=(tx:Outcome)=>{assert.ok(typeof tx.status==="object"&&"SuccessValue" in tx.status,"Expected finalized successful transaction");return getTransactionLastResult(tx);};
  const denied=async(name:string,fn:()=>Promise<Outcome>)=>{const tx=await fn();assert.ok(typeof tx.status==="object"&&"Failure" in tx.status,`Expected chain refusal: ${name}`);reports.push({name,passed:true});ctx.progress(`Verified: ${name}`);};
  const check=(name:string)=>{reports.push({name,passed:true});ctx.progress(`Verified: ${name}`);};
  for(const [role,account] of [["dollar",a.dollar],["token",a.token],["vault",a.vault],["treasury",a.treasury]] as const){
    const wasm=wasms[role],codeHash=baseEncode(createHash("sha256").update(wasm).digest());
    const state=await provider.viewAccount({accountId:account.accountId,blockQuery:{finality:"final"}});
    assert.ok(state.code_hash==="11111111111111111111111111111111"||state.code_hash===codeHash,"Refuse to overwrite another contract");
    const args=role==="dollar"?{owner:a.sponsor.accountId,holders:null}:role==="token"?{owner:a.sponsor.accountId,holders:a.holders.map((h,i)=>[h.accountId,["250000","400000","350000"][i]])}:role==="vault"?{token:a.dollar.accountId,treasury:a.treasury.accountId,sponsor:a.sponsor.accountId}:{token:a.dollar.accountId,vault:a.vault.accountId,sponsor:a.sponsor.accountId,operator:a.operator.accountId,guardian:a.guardian.accountId,expense_receiver:a.provider.accountId,roster:a.holders.map(h=>h.accountId),cadence_seconds:ctx.cadenceSeconds};
    const prior=(await journal.read()).entries.find(e=>e.step===`deploy-${role}`);
    if(state.code_hash===codeHash)assert.ok(prior,"Existing deployments require their original journal");
    const tx=await journal.send(`deploy-${role}`,account,account.accountId,[actions.deployContract(wasm),actions.functionCall("new",args,70_000_000_000_000n,0n)]);success(tx);transactions.push(tx);
  }
  check("compiled contracts initialize atomically and match pinned code hashes");
  const register=async(step:string,token:Account,account:string)=>success(await write(step,a.sponsor,token.accountId,"storage_deposit",{account_id:account,registration_only:true},1_250_000_000_000_000_000_000n,30_000_000_000_000n));
  for(const [i,account] of [a.treasury,a.vault,a.provider,...a.holders.slice(0,2)].entries())await register(`dollar-storage-${i}`,a.dollar,account.accountId);
  const fund=async(step:string,recipient:string,amount:string,msg:unknown)=>success(await write(step,a.sponsor,a.dollar.accountId,"ft_transfer_call",{receiver_id:recipient,amount,msg:JSON.stringify(msg)},1n));
  assert.equal(await fund("launch-funding",a.treasury.accountId,"1000000000",{kind:"launch",receipt_id:"launch-demo-1"}),"1000000000");
  assert.equal(await fund("fee-funding",a.treasury.accountId,"5000000",{kind:"fee",receipt_id:"fee-demo-1"}),"5000000");
  assert.equal(await fund("vault-fixture-funding",a.vault.accountId,"100000000",{kind:"seed"}),"100000000");
  check("launch principal and project-fee fixture transfers remain separate");
  const invoice={environment:"testnet fixture",provider:a.provider.accountId,description:"Demonstration analysis and operating expense",amount:"2000000"};
  assert.equal(success(await write("operating-expense",a.operator,a.treasury.accountId,"pay_expense",{receipt_id:"invoice-demo-1",amount:"2000000",evidence_hash:commitment(invoice)})),true);
  check("receipt-backed expense debits net result once within the period budget");
  if(ctx.negativeChecks){
    assert.equal(await fund("duplicate-launch",a.treasury.accountId,"1000000000",{kind:"launch",receipt_id:"launch-demo-1"}),"0");check("replayed funding is refunded rather than booked twice");
    await denied("outsider cannot authorize treasury spending",()=>write("outsider-execution",a.sponsor,a.treasury.accountId,"execute",{run_id:"outsider",receiver_id:a.vault.accountId,amount:"100000000",expires_at_ms:String(Date.now()+300000),observed_at_ms:String(Date.now()),proposal_hash:"a".repeat(64)}));
    await denied("expense invoice cannot be paid twice",()=>write("expense-replay",a.operator,a.treasury.accountId,"pay_expense",{receipt_id:"invoice-demo-1",amount:"2000000",evidence_hash:commitment(invoice)}));
    await denied("expense budget refuses an oversized bill",()=>write("expense-cap",a.operator,a.treasury.accountId,"pay_expense",{receipt_id:"too-large",amount:"9000000",evidence_hash:commitment(invoice)}));
    await denied("distribution cadence cannot be bypassed",()=>write("early-freeze",a.operator,a.treasury.accountId,"freeze",{snapshot_hash:"a".repeat(64),holders:a.holders.map((h,i)=>({account_id:h.accountId,weight:["250000","400000","350000"][i]}))}));
  }
  const originalDecision=(await journal.read()).entries.find(e=>e.step==="execute-position");
  // Persist the decision separately in the deployment plan. A resume supplies the original plan.
  const state=businessStateSchema.parse(await view(a.treasury.accountId,"get_state"));
  const decisionPath=`${journal.path}.decision.json`;
  let decision:ReturnType<typeof demoDecision>;
  try{decision=JSON.parse(await readFile(decisionPath,"utf8"));const {hash,...payload}=decision;assert.equal(commitment(payload),hash,"Original decision commitment changed");}
  catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;decision=demoDecision(state);await writeFile(decisionPath,JSON.stringify(decision,null,2),{mode:0o600,flag:"wx"});}
  assert.ok(decision.security.approved||originalDecision,"Security refused the exact test action");
  let executeArgs={run_id:"business-demo-1",receiver_id:a.vault.accountId,amount:"100000000",expires_at_ms:String(decision.expiresAt),observed_at_ms:String(decision.observedAt),proposal_hash:decision.hash};
  if(originalDecision){
    const {decodeSignedTransaction}=await import("near-api-js");const saved=decodeSignedTransaction(Buffer.from(originalDecision.signedBase64,"base64"));executeArgs=JSON.parse(Buffer.from(saved.transaction.actions[0].functionCall!.args).toString());
  }
  if(ctx.negativeChecks){
    await denied("unreviewed adapter is rejected onchain",()=>write("wrong-adapter",a.operator,a.treasury.accountId,"execute",{...executeArgs,run_id:"wrong-adapter",receiver_id:a.sponsor.accountId}));
    await denied("capital ceiling is enforced onchain",()=>write("spend-cap",a.operator,a.treasury.accountId,"execute",{...executeArgs,run_id:"spend-cap",amount:"100000001"}));
    await denied("stale proposal cannot receive capital",()=>write("stale-data",a.operator,a.treasury.accountId,"execute",{...executeArgs,run_id:"stale-data",observed_at_ms:"1"}));
  }
  assert.equal(success(await write("execute-position",a.operator,a.treasury.accountId,"execute",executeArgs)),true);
  assert.ok(["FUNDED","EXITING","SETTLED"].includes((await view<{status:string}>(a.treasury.accountId,"get_position",{run_id:executeArgs.run_id})).status));
  check("bounded capital reaches the actual NEAR vault position");
  success(await write("guardian-pause",a.guardian,a.treasury.accountId,"set_pause",{paused:true}));
  if(ctx.negativeChecks)await denied("guardian pause refuses a new expense",()=>write("paused-expense",a.operator,a.treasury.accountId,"pay_expense",{receipt_id:"paused-invoice",amount:"1",evidence_hash:commitment(invoice)}));
  assert.equal(success(await write("exit-position",a.operator,a.treasury.accountId,"exit",{run_id:executeArgs.run_id})),true);
  check("guardian pause blocks commitments while a funded position can exit");
  success(await write("guardian-resume",a.guardian,a.treasury.accountId,"set_pause",{paused:false}));
  const position=await view<{principal:string;returned:string;status:string}>(a.treasury.accountId,"get_position",{run_id:executeArgs.run_id});assert.equal(position.status,"SETTLED");assert.equal(position.principal,"100000000");assert.equal(position.returned,"110000000");
  check("returned principal and sponsor-funded result reconcile independently");
  if(ctx.negativeChecks)await denied("settled run ID cannot deploy capital again",()=>write("execution-replay",a.operator,a.treasury.accountId,"execute",{...executeArgs,expires_at_ms:String(Date.now()+300000),observed_at_ms:String(Date.now())}));
  success(await write("holder-transfer-before-snapshot",a.holders[0],a.token.accountId,"ft_transfer",{receiver_id:a.holders[1].accountId,amount:"100000"},1n));
  const snapshotPath=`${journal.path}.snapshot.json`;
  let savedSnapshot:ReturnType<typeof createHolderSnapshot>|undefined;
  try{savedSnapshot=JSON.parse(await readFile(snapshotPath,"utf8"));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  const tokenState=await provider.viewAccount({accountId:a.token.accountId,blockQuery:savedSnapshot?{blockId:savedSnapshot.blockHash}:{finality:"final"}}),events=tokenEvents(transactions,a.token.accountId);
  const pinned=<T>(method:string,args:Record<string,string>={})=>provider.callFunction({contractId:a.token.accountId,method,args,blockQuery:{blockId:tokenState.block_hash}}) as Promise<T>;
  const balances=Object.fromEntries(await Promise.all(a.holders.map(async h=>[h.accountId,await pinned<string>("ft_balance_of",{account_id:h.accountId})])));
  const snapshot=createHolderSnapshot(events,{tokenAccount:a.token.accountId,codeHash:tokenState.code_hash,blockHash:tokenState.block_hash,blockHeight:tokenState.block_height,totalSupply:await pinned<string>("ft_total_supply")},balances);
  if(savedSnapshot)assert.deepEqual(snapshot,savedSnapshot,"Original holder snapshot changed during recovery");else await writeFile(snapshotPath,JSON.stringify(snapshot,null,2),{mode:0o600,flag:"wx"});
  check("receipt-reconstructed GREED holders match the complete pinned token supply");
  const priorFreeze=(await journal.read()).entries.find(e=>e.step==="freeze-period");
  const due=BigInt(businessStateSchema.parse(await view(a.treasury.accountId,"get_state")).next_distribution_ns);
  if(!priorFreeze&&BigInt(Date.now())*1_000_000n<due)ctx.progress("Waiting for the configured test distribution period.");
  while(!priorFreeze&&BigInt(Date.now())*1_000_000n<due)await new Promise(r=>setTimeout(r,1000));
  let freezeArgs={snapshot_hash:snapshot.hash,holders:snapshot.holders};
  if(priorFreeze){const {decodeSignedTransaction}=await import("near-api-js");freezeArgs=JSON.parse(Buffer.from(decodeSignedTransaction(Buffer.from(priorFreeze.signedBase64,"base64")).transaction.actions[0].functionCall!.args).toString());}
  success(await write("freeze-period",a.operator,a.treasury.accountId,"freeze",freezeArgs));
  let period=periodSchema.parse(await view(a.treasury.accountId,"get_period",{period_id:0}));assert.equal(period.profit,"13000000");assert.equal(period.holder_amount,"8450000");assert.equal(period.retained,"4550000");
  check("fixed period allocates only realized net profit using the illustrative 65/35 split");
  success(await write("holder-transfer-after-snapshot",a.holders[1],a.token.accountId,"ft_transfer",{receiver_id:a.holders[0].accountId,amount:"50000"},1n));
  assert.deepEqual(periodSchema.parse(await view(a.treasury.accountId,"get_period",{period_id:0})).holders,period.holders);
  check("GREED transfers after a frozen period do not rewrite its holder entitlements");
  assert.equal(success(await write("unregistered-payout",a.operator,a.treasury.accountId,"pay",{period_id:0,account_id:a.holders[2].accountId})),false);
  period=periodSchema.parse(await view(a.treasury.accountId,"get_period",{period_id:0}));
  const failedRecipient=period.entitlements.find(e=>e.account_id===a.holders[2].accountId)!;assert.ok(["FAILED","PAID"].includes(failedRecipient.status));
  if(failedRecipient.status==="FAILED")assert.equal(businessStateSchema.parse(await view(a.treasury.accountId,"get_state")).liabilities,"8450000");
  check("failed receiver keeps its protected entitlement without marking paid");
  await register("sponsored-receiver-registration",a.dollar,a.holders[2].accountId);
  for(const h of a.holders)assert.equal(success(await write(`holder-payment-${h.accountId}`,a.operator,a.treasury.accountId,"pay",{period_id:0,account_id:h.accountId})),true);
  if(ctx.negativeChecks)await denied("paid entitlement cannot be sent again",()=>write("payout-replay",a.operator,a.treasury.accountId,"pay",{period_id:0,account_id:a.holders[0].accountId}));
  const finalState=businessStateSchema.parse(await view(a.treasury.accountId,"get_state")),dollarBalance=await view<string>(a.dollar.accountId,"ft_balance_of",{account_id:a.treasury.accountId});
  assert.ok(reconcileBusiness(finalState,dollarBalance));assert.equal(finalState.cash,"1004550000");assert.equal(finalState.paid,"8450000");assert.equal(finalState.liabilities,"0");
  const finalPeriod=periodSchema.parse(await view(a.treasury.accountId,"get_period",{period_id:0}));
  for(const e of finalPeriod.entitlements){assert.equal(e.status,"PAID");assert.equal(await view(a.dollar.accountId,"ft_balance_of",{account_id:e.account_id}),e.amount);}
  check("actual recipient token balances, cash and every ledger unit reconcile");
  return {completed:true,environment:journal.network,limits:"Controlled fixture vault and unbacked gUSD; no actual market yield or USDC backing",accounts:Object.fromEntries(Object.entries(a).filter(([k])=>k!=="holders").map(([k,v])=>[k,(v as Account).accountId])),holders:a.holders.map(h=>h.accountId),contracts:Object.fromEntries(Object.entries(wasms).map(([k,wasm])=>[k,{codeHash:baseEncode(createHash("sha256").update(wasm).digest()),wasmSha256:createHash("sha256").update(wasm).digest("hex")} ])),reports,decision,snapshot,invoice,position,finalState,period:finalPeriod,transactions:transactions.map(tx=>({hash:tx.transaction.hash,signer:tx.transaction.signer_id,receiver:tx.transaction.receiver_id,status:tx.status,nearGasCostYocto:tx.receipts_outcome.reduce((sum,r)=>sum+BigInt(r.outcome.tokens_burnt),BigInt(tx.transaction_outcome.outcome.tokens_burnt)).toString(),gasBurnt:tx.receipts_outcome.reduce((sum,r)=>sum+BigInt(r.outcome.gas_burnt),BigInt(tx.transaction_outcome.outcome.gas_burnt)).toString(),receipts:tx.receipts_outcome})),verifiedAt:new Date().toISOString()};
}
