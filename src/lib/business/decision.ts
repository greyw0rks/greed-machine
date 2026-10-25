import { createHash } from "node:crypto";
import type { BusinessState } from "./schemas";

export function demoDecision(state:BusinessState,now=Date.now()){
  const available=BigInt(state.cash)-BigInt(state.liabilities)-BigInt(state.expense_pending),amount=100_000_000n;
  const candidates=[{agent:"Capital scout",receiver_id:state.vault,amount:amount.toString(),reason:"The reviewed demo vault accepts capped capital with sponsor-funded fixture returns."},{agent:"Reserve scout",receiver_id:state.vault,amount:"0",reason:"Holding cash is valid when policy, liquidity or evidence is insufficient."}];
  const debate=[{agent:"Adversarial reviewer",text:"The sponsor funds returns; this is a transaction-mechanics rehearsal, not market yield. Verify deployed builds, liabilities and the receiver before signing."},{agent:"Capital scout",text:"Use only 100 demo dollars. Preserve the 25% reserve and every unpaid entitlement; exit remains available during guardian pause."}];
  const selected=candidates[0],checks=[{rule:"Immutable adapter",passed:selected.receiver_id===state.vault},{rule:"Spending cap",passed:amount<=BigInt(state.max_spend)},{rule:"Liquid reserve and liabilities",passed:available-amount>=BigInt(state.reserve_floor)},{rule:"No unresolved position or expense",passed:state.active===null&&state.expense_pending==="0"},{rule:"Guardian pause",passed:!state.paused}];
  const decision={environment:"controlled-testnet-rehearsal",agentMode:"deterministic fixture",observedAt:now,expiresAt:now+300000,candidates,debate,selected,security:{agent:"Independent deterministic reviewer",approved:checks.every(c=>c.passed),checks}};
  return {...decision,hash:createHash("sha256").update(JSON.stringify(decision)).digest("hex")};
}
