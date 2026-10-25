import { NextRequest,NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { hasSameOrigin } from "@/lib/request-security";
import { authenticateWallet,createWalletChallenge,signedWalletSchema } from "@/lib/wallet-auth";
import { setWalletSession,sessionHolder } from "@/lib/auth";
import { dashboard } from "@/lib/database";
import { walletConfigured } from "@/lib/near-governance";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const schema=z.discriminatedUnion("action",[z.object({action:z.literal("challenge")}).strict(),z.object({action:z.literal("verify"),challengeId:z.string().uuid(),signed:signedWalletSchema}).strict()]);
const BROWSER_COOKIE="greed_wallet_challenge";
export async function POST(req:NextRequest){
  if(!hasSameOrigin(req))return NextResponse.json({error:"Request origin does not match this app."},{status:403});
  try{
    if(!walletConfigured())throw new Error("Wallet governance is not configured.");
    const body=await req.text();if(Buffer.byteLength(body)>8000)return NextResponse.json({error:"Request is too large."},{status:413});
    const action=schema.parse(JSON.parse(body)),origin=req.headers.get("origin")!;
    const jar=await cookies();
    if(action.action==="challenge"){
      const browserToken=randomBytes(32).toString("hex"),challenge=createWalletChallenge(origin,browserToken);
      jar.set(BROWSER_COOKIE,browserToken,{httpOnly:true,sameSite:"strict",secure:process.env.COOKIE_SECURE==="true",maxAge:300,path:"/"});
      return NextResponse.json(challenge,{headers:{"Cache-Control":"no-store"}});
    }
    const browserToken=jar.get(BROWSER_COOKIE)?.value;if(!browserToken)throw new Error("Wallet challenge is missing. Start sign-in again.");
    const session=await authenticateWallet(action.challengeId,browserToken,origin,action.signed);
    await setWalletSession(session.token);jar.delete(BROWSER_COOKIE);
    return NextResponse.json({state:dashboard(await sessionHolder())},{headers:{"Cache-Control":"no-store"}});
  }catch(error){const message=error instanceof z.ZodError||error instanceof SyntaxError?"Invalid wallet sign-in request.":error instanceof Error?error.message:"Wallet sign-in failed.";return NextResponse.json({error:message},{status:400,headers:{"Cache-Control":"no-store"}});}
}
