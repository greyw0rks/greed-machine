import { NextResponse } from "next/server";
import { observeNear } from "@/lib/near-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const observation = await observeNear({ rpcUrl: process.env.NEAR_RPC_URL || "https://rpc.testnet.near.org", accountId: process.env.NEAR_POLICY_ACCOUNT || undefined, expectedCodeHash: process.env.NEAR_POLICY_CODE_HASH || undefined, recordId: process.env.NEAR_PROOF_RECORD_ID || undefined });
    return NextResponse.json(observation, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.name !== "ZodError" && error.name !== "SyntaxError" ? error.message : "NEAR returned invalid policy evidence.";
    return NextResponse.json({ connected: false, error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
