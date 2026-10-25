import type { NextRequest } from "next/server";
export function hasSameOrigin(req:NextRequest){
  const origin=req.headers.get("origin"),host=req.headers.get("host");if(!origin||!host)return false;
  try{const source=new URL(origin);const protocol=req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()||req.nextUrl.protocol.slice(0,-1);return source.host===host&&source.protocol===`${protocol}:`;}catch{return false;}
}
