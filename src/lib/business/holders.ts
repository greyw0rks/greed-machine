import { createHash } from "node:crypto";
import { nearAccountSchema } from "../near-governance";

export interface TokenEvent { receiptId:string; logIndex:number; event:"ft_mint"|"ft_burn"|"ft_transfer"; data:{owner_id?:string;old_owner_id?:string;new_owner_id?:string;amount:string}[] }
export interface HolderSnapshot { tokenAccount:string;codeHash:string;blockHash:string;blockHeight:number;totalSupply:string;source:"reconstructed NEP-141 receipts";eventHash:string;holders:{account_id:string;weight:string}[];hash:string }
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function reconstructHolders(events:TokenEvent[]) {
  const seen=new Map<string,string>(),balances=new Map<string,bigint>();
  const change=(account:string|undefined,amount:bigint)=>{nearAccountSchema.parse(account);const next=(balances.get(account!)??0n)+amount;if(next<0n||next>=2n**128n)throw new Error("Token event exceeds the reconstructed balance.");balances.set(account!,next);};
  for(const entry of events){
    if(!entry.receiptId||!Number.isSafeInteger(entry.logIndex)||entry.logIndex<0)throw new Error("Missing receipt/log identity.");
    const id=`${entry.receiptId}:${entry.logIndex}`,hash=digest(entry);
    if(seen.has(id)){if(seen.get(id)!==hash)throw new Error("Conflicting token receipt.");continue;}seen.set(id,hash);
    for(const row of entry.data){
      if(!/^[1-9]\d{0,38}$/.test(row.amount)||BigInt(row.amount)>=2n**128n)throw new Error("Invalid token event amount.");const amount=BigInt(row.amount);
      if(entry.event==="ft_mint")change(row.owner_id,amount);
      else if(entry.event==="ft_burn")change(row.owner_id,-amount);
      else if(entry.event==="ft_transfer"){change(row.old_owner_id,-amount);change(row.new_owner_id,amount);}
      else throw new Error("Unsupported NEP-141 event.");
    }
  }
  return {holders:[...balances].filter(([,amount])=>amount>0n).sort(([a],[b])=>a.localeCompare(b)).map(([account_id,weight])=>({account_id,weight:weight.toString()})),eventHash:digest([...seen])};
}
export function createHolderSnapshot(events:TokenEvent[],evidence:Omit<HolderSnapshot,"source"|"eventHash"|"holders"|"hash">,finalizedBalances:Record<string,string>):HolderSnapshot {
  const indexed=reconstructHolders(events);nearAccountSchema.parse(evidence.tokenAccount);
  if(!evidence.tokenAccount.endsWith(".testnet")||![evidence.codeHash,evidence.blockHash].every(h=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(h))||!Number.isSafeInteger(evidence.blockHeight)||evidence.blockHeight<=0||!/^[1-9]\d{0,38}$/.test(evidence.totalSupply))throw new Error("Invalid pinned testnet holder evidence.");
  if(indexed.holders.reduce((sum,h)=>sum+BigInt(h.weight),0n)!==BigInt(evidence.totalSupply))throw new Error("Indexed holders do not cover the full token supply.");
  for(const h of indexed.holders)if(finalizedBalances[h.account_id]!==h.weight)throw new Error("Finalized balances disagree with reconstructed token events.");
  const payload={...evidence,source:"reconstructed NEP-141 receipts" as const,...indexed};return {...payload,hash:digest(payload)};
}
