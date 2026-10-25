import { z } from "zod";
import { nearAccountSchema } from "../near-governance";
const uint=z.string().regex(/^(0|[1-9]\d*)$/).refine(v=>BigInt(v)<2n**128n),hash=z.string().regex(/^[a-f0-9]{64}$/);
const account=nearAccountSchema.refine(v=>v.endsWith(".testnet"));
export const businessStateSchema=z.object({schema_version:z.literal(1),environment:z.literal("testnet-demo-token"),token:account,vault:account,sponsor:account,operator:account,guardian:account,expense_receiver:account,roster:z.array(account).min(1).max(8),cash:uint,principal:uint,reserved:uint,net:z.string().regex(/^-?\d+$/),watermark:uint,paid:uint,liabilities:uint,expense_pending:uint,expense_budget_used:uint,expense_budget:z.literal("10000000"),reserve_floor:uint,max_spend:z.literal("100000000"),holder_bps:z.literal(6500),cadence_ns:uint,next_distribution_ns:uint,paused:z.boolean(),active:z.string().nullable(),period_count:z.number().int().min(0).max(100)}).strict();
export const periodSchema=z.object({id:z.number().int().nonnegative(),snapshot_hash:hash,holders:z.array(z.object({account_id:account,weight:uint})),profit:uint,holder_amount:uint,retained:uint,entitlements:z.array(z.object({account_id:account,amount:uint,status:z.enum(["PENDING","SENDING","PAID","FAILED"]),attempts:z.number().int().nonnegative()}))}).strict();
export type BusinessState=z.infer<typeof businessStateSchema>;
export type BusinessPeriod=z.infer<typeof periodSchema>;
export function reconcileBusiness(s:BusinessState,tokenBalance:string){
  if(s.active!==null||s.reserved!=="0"||s.expense_pending!=="0")return false;
  return BigInt(s.cash)===BigInt(tokenBalance)&&BigInt(s.cash)+BigInt(s.reserved)===BigInt(s.principal)+BigInt(s.net)-BigInt(s.paid)&&BigInt(s.cash)>=BigInt(s.liabilities)+BigInt(s.reserve_floor);
}
export function formatDemoDollar(raw:string){const amount=BigInt(raw),negative=amount<0n,padded=(negative?-amount:amount).toString().padStart(7,"0");return `${negative?"-":""}${padded.slice(0,-6)}.${padded.slice(-6)}`;}
