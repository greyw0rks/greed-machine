import { createHash } from "node:crypto";
import type { Recipient, Entitlement } from "./types";

export function validateRecipients(recipients: Recipient[]) {
  if (!recipients.length || recipients.length > 1000) throw new Error("A distribution needs 1–1,000 fixture recipients.");
  const ids = new Set<string>();
  for (const r of recipients) {
    if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(r.id) || !r.name || r.name.length > 100 || !/^[1-9]\d{0,38}$/.test(r.weight) || ids.has(r.id)) throw new Error("Recipient IDs must be unique and weights must be positive integers.");
    ids.add(r.id);
  }
  return [...recipients].sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
export function allocateEntitlements(poolMicros: number, recipients: Recipient[]): Entitlement[] {
  if (!Number.isSafeInteger(poolMicros) || poolMicros < 0) throw new Error("Payout budget must be nonnegative integer microdollars.");
  const ordered = validateRecipients(recipients), total = ordered.reduce((n,r)=>n+BigInt(r.weight),0n), pool = BigInt(poolMicros);
  const rows = ordered.map(r=>({r,amount:pool*BigInt(r.weight)/total,remainder:pool*BigInt(r.weight)%total}));
  let left = pool-rows.reduce((n,r)=>n+r.amount,0n);
  for (const row of [...rows].sort((a,b)=>a.remainder===b.remainder ? (a.r.id<b.r.id?-1:1) : a.remainder>b.remainder?-1:1)) { if (left===0n) break; row.amount++; left--; }
  return rows.map(({r,amount})=>({recipientId:r.id,name:r.name,weight:r.weight,amountMicros:Number(amount),status:amount===0n?"paid":"pending",attempts:0,receipt:null,error:null}));
}
export function profitSplit(totalNet: number, watermark: number, holderBps: number) {
  if (![totalNet,watermark,holderBps].every(Number.isSafeInteger) || watermark<0 || holderBps<6000 || holderBps>7000) throw new Error("Invalid profit policy.");
  const profitMicros = Math.max(0,totalNet-watermark);
  const holderMicros = Number(BigInt(profitMicros)*BigInt(holderBps)/10000n);
  return {profitMicros,holderMicros,retainedMicros:profitMicros-holderMicros};
}
export function fixtureReceipt(periodId: string, recipientId: string, amountMicros: number) {
  return `sim:${createHash("sha256").update(JSON.stringify([periodId,recipientId,amountMicros])).digest("hex")}`;
}
