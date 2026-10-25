import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { hasSameOrigin } from "@/lib/request-security";
import { configureFoundation, foundationData, freezeDistribution, pauseFoundation, payDistributions, requestCycle, resolveModelCall, tickFoundation } from "@/lib/foundation/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const actions=z.discriminatedUnion("action",[
  z.object({action:z.literal("cycle"),scenarioId:z.string().max(80)}).strict(),
  z.object({action:z.literal("tick")}).strict(),z.object({action:z.literal("distribute")}).strict(),z.object({action:z.literal("retry")}).strict(),
  z.object({action:z.literal("pause"),paused:z.boolean()}).strict(),
  z.object({action:z.literal("resolve-model-call"),callId:z.string().uuid(),costMicros:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),evidence:z.string().min(10).max(2000)}).strict(),
  z.object({action:z.literal("configure"),enabled:z.boolean().optional(),holderBps:z.number().int().min(6000).max(7000).optional(),agentMode:z.enum(["simulation","model"]).optional(),blockedRecipients:z.array(z.string().max(80)).max(1000).optional()}).strict()
]);
export async function GET(){return NextResponse.json(foundationData(),{headers:{"Cache-Control":"no-store"}});}
export async function POST(req:NextRequest){
  if(!hasSameOrigin(req))return NextResponse.json({error:"Request origin does not match."},{status:403});
  const expected=process.env.FOUNDATION_OPERATOR_TOKEN;
  const supplied=req.headers.get("authorization")?.replace(/^Bearer /,"")||"";
  const local=["localhost","127.0.0.1","[::1]"].includes(req.nextUrl.hostname);
  if(expected?(Buffer.byteLength(expected)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))):!local)return NextResponse.json({error:"An operator token is required for this action."},{status:401});
  try{
    const raw=await req.text();if(Buffer.byteLength(raw)>4000)return NextResponse.json({error:"Request too large."},{status:413});
    const body=actions.parse(JSON.parse(raw));
    if(body.action==="cycle")requestCycle(body.scenarioId);
    if(body.action==="tick")await tickFoundation(true);
    if(body.action==="pause")pauseFoundation(body.paused);
    if(body.action==="distribute")freezeDistribution();
    if(body.action==="retry")payDistributions();
    if(body.action==="resolve-model-call")resolveModelCall(body.callId,body.costMicros,body.evidence);
    if(body.action==="configure"){
      if(body.agentMode==="model"&&!expected)throw new Error("Set FOUNDATION_OPERATOR_TOKEN before enabling paid model calls through the web.");
      const {action:_action,...change}=body;configureFoundation(change);
    }
    return NextResponse.json(foundationData(),{headers:{"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({error:error instanceof z.ZodError||error instanceof SyntaxError?"Invalid foundation action.":error instanceof Error?error.message:"Action failed.",foundation:foundationData()},{status:400});}
}
