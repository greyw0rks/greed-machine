import { NextRequest,NextResponse } from "next/server";
import { savedBusinessReport,observeBusiness } from "@/lib/business/report";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  try { const report=await savedBusinessReport();const observation=report&&req.nextUrl.searchParams.get("live")==="1"?await observeBusiness(report):null;return NextResponse.json({report,observation},{headers:{"Cache-Control":"no-store"}}); }
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Business proof could not be read."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
