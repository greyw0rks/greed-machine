import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { GovernanceRpc,nearAccountSchema } from "../near-governance";
import { businessStateSchema,periodSchema,reconcileBusiness } from "./schemas";

const chainHash=z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),account=nearAccountSchema.refine(v=>v.endsWith(".testnet"));
export const reportSchema=z.object({completed:z.literal(true),environment:z.enum(["testnet","local-near-sandbox"]),verifiedAt:z.string().datetime(),limits:z.string(),accounts:z.record(z.string(),account),contracts:z.record(z.string(),z.object({codeHash:chainHash,wasmSha256:z.string().regex(/^[a-f0-9]{64}$/)})),reports:z.array(z.object({name:z.string(),passed:z.literal(true)})),finalState:businessStateSchema,period:periodSchema,transactions:z.array(z.object({hash:chainHash,signer:account,receiver:account,nearGasCostYocto:z.string().optional(),gasBurnt:z.string().optional()})),snapshot:z.object({tokenAccount:account,codeHash:chainHash,blockHash:chainHash,blockHeight:z.number().int().positive(),totalSupply:z.string(),source:z.literal("reconstructed NEP-141 receipts"),eventHash:z.string(),holders:z.array(z.object({account_id:account,weight:z.string()})),hash:z.string().regex(/^[a-f0-9]{64}$/)}),decision:z.object({agentMode:z.string(),debate:z.array(z.object({agent:z.string(),text:z.string()})),security:z.object({approved:z.boolean(),checks:z.array(z.object({rule:z.string(),passed:z.boolean()}))})})});
export type BusinessReport=z.infer<typeof reportSchema>;
export interface BusinessObservation { blockHash:string;blockHeight:number;observedAt:string;state:z.infer<typeof businessStateSchema>;period:z.infer<typeof periodSchema>;treasuryTokenBalance:string;recipientBalances:{accountId:string;amount:string}[];reconciled:boolean }
export async function savedBusinessReport():Promise<BusinessReport|null>{
  for(const name of ["business-testnet.json","business-sandbox.json"]){
    try{const raw=await readFile(join(process.cwd(),"evidence",name),"utf8");if(Buffer.byteLength(raw)>2_000_000)throw new Error("Business evidence is too large.");const report=reportSchema.parse(JSON.parse(raw));if(name==="business-testnet.json"&&report.environment!=="testnet")throw new Error("Public evidence environment mismatch.");return report;}
    catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw new Error("Saved business evidence needs review before it can be displayed.");}
  }
  return null;
}
export async function observeBusiness(report:BusinessReport,rpc=new GovernanceRpc()):Promise<BusinessObservation>{
  if(report.environment!=="testnet")throw new Error("Sandbox evidence cannot be verified against public testnet.");await rpc.testnet();
  const block=z.object({header:z.object({hash:chainHash,height:z.number().int().positive(),timestamp_nanosec:z.string().regex(/^\d+$/)})}).parse(await rpc.rpc("block",{finality:"final"}));
  const timestamp=Number(BigInt(block.header.timestamp_nanosec)/1_000_000n);
  if(!Number.isSafeInteger(timestamp)||timestamp<Date.now()-120_000||timestamp>Date.now()+30_000)throw new Error("Finalized business state is stale. Try a synced testnet RPC.");
  const roles=["treasury","vault","dollar","token"];
  await Promise.all(roles.map(async role=>{
    const id=report.accounts[role],expected=report.contracts[role];if(!id||!expected)throw new Error("Incomplete contract evidence.");
    const state=z.object({code_hash:chainHash,block_hash:chainHash}).parse(await rpc.rpc("query",{request_type:"view_account",account_id:id,block_id:block.header.hash}));
    if(state.block_hash!==block.header.hash||state.code_hash!==expected.codeHash)throw new Error("A deployed contract differs from the recorded build.");
  }));
  const [stateValue,periodValue,balanceValue,metadata]=await Promise.all([
    rpc.view(report.accounts.treasury,"get_state",{},block.header.hash),
    rpc.view(report.accounts.treasury,"get_period",{period_id:report.period.id},block.header.hash),
    rpc.view(report.accounts.dollar,"ft_balance_of",{account_id:report.accounts.treasury},block.header.hash),
    rpc.view(report.accounts.dollar,"ft_metadata",{},block.header.hash),
  ]);
  const state=businessStateSchema.parse(stateValue),period=periodSchema.parse(periodValue),treasuryTokenBalance=z.string().regex(/^\d+$/).parse(balanceValue);
  z.object({symbol:z.literal("gUSD"),decimals:z.literal(6)}).parse(metadata);
  if(state.token!==report.accounts.dollar||state.vault!==report.accounts.vault||period.snapshot_hash!==report.period.snapshot_hash)throw new Error("Treasury or frozen snapshot binding changed.");
  const recipientBalances=await Promise.all(period.entitlements.map(async e=>({accountId:e.account_id,amount:z.string().regex(/^\d+$/).parse(await rpc.view(report.accounts.dollar,"ft_balance_of",{account_id:e.account_id},block.header.hash))})));
  const unpaid=period.entitlements.filter(e=>e.status!=="PAID").reduce((sum,e)=>sum+BigInt(e.amount),0n);
  const allocation=period.entitlements.reduce((sum,e)=>sum+BigInt(e.amount),0n);
  const reconciled=reconcileBusiness(state,treasuryTokenBalance)&&unpaid===BigInt(state.liabilities)&&allocation===BigInt(period.holder_amount)&&BigInt(period.holder_amount)+BigInt(period.retained)===BigInt(period.profit)&&period.entitlements.every(e=>e.status!=="SENDING");
  return {blockHash:block.header.hash,blockHeight:block.header.height,observedAt:new Date().toISOString(),state,period,treasuryTokenBalance,recipientBalances,reconciled};
}
