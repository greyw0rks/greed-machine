import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getMeta } from "./database";
import { HOLDERS } from "./scenarios";
import { parseWalletSession, revokeWalletSession, requireWalletSession } from "./wallet-auth";
const COOKIE = "greed_demo_session";
export const WALLET_COOKIE="greed_wallet_session";
function signature(value: string) { return createHmac("sha256", process.env.SESSION_SECRET || getMeta<string>("session-secret")).update(value).digest("hex"); }
export function makeSession(holderId: string) {
  const value = `${holderId}:${Date.now() + 24 * 60 * 60 * 1000}`;
  return `${value}:${signature(value)}`;
}
export function parseSession(token: string | undefined) {
  if (!token) return null;
  const [holderId, expiry, sig] = token.split(":");
  if (!holderId || !expiry || !sig || !/^\d+$/.test(expiry) || Date.now() >= Number(expiry) || !HOLDERS.some(h => h.id === holderId)) return null;
  const expected = signature(`${holderId}:${expiry}`);
  if (sig.length !== expected.length || !/^[a-f0-9]+$/.test(sig)) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? holderId : null;
}
export async function sessionHolder() { const jar=await cookies();return parseWalletSession(jar.get(WALLET_COOKIE)?.value)||(process.env.DEMO_SESSIONS_ENABLED==="false"?null:parseSession(jar.get(COOKIE)?.value)); }
export async function requireHolder() { const jar=await cookies(),token=jar.get(WALLET_COOKIE)?.value;if(token)return requireWalletSession(token);const id = await sessionHolder(); if (!id) throw new Error("Choose a demo holder or verify a wallet to use this action."); return id; }
export async function setSession(holderId: string | null) {
  const jar = await cookies();
  revokeWalletSession(jar.get(WALLET_COOKIE)?.value);jar.delete(WALLET_COOKIE);
  if (!holderId) { jar.delete(COOKIE); return; }
  if (process.env.DEMO_SESSIONS_ENABLED === "false") throw new Error("Demo sessions are disabled in this environment.");
  if (!HOLDERS.some(h => h.id === holderId)) throw new Error("Unknown demo holder.");
  jar.set(COOKIE, makeSession(holderId), { httpOnly: true, sameSite: "strict", secure: process.env.COOKIE_SECURE === "true", maxAge: 86400, path: "/" });
}
export async function setWalletSession(token:string){const jar=await cookies();revokeWalletSession(jar.get(WALLET_COOKIE)?.value);jar.delete(COOKIE);jar.set(WALLET_COOKIE,token,{httpOnly:true,sameSite:"strict",secure:process.env.COOKIE_SECURE==="true",maxAge:3600,path:"/"});}
