import { createHash, createPublicKey, randomBytes, randomUUID, verify } from "node:crypto";
import { baseDecode } from "near-api-js";
import { z } from "zod";
import { db, storeWalletHolder, transaction, appendEvent } from "./database";
import { GovernanceRpc, nearAccountSchema } from "./near-governance";

export interface WalletChallenge {id:string;nonce:string;message:string;recipient:string;expiresAt:number}
const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
export const signedWalletSchema=z.object({accountId:nearAccountSchema,publicKey:z.string().regex(/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,44}$/),signature:z.string().regex(/^[A-Za-z0-9+/]{86}==$/)}).strict();
function encodedString(value:string){const bytes=Buffer.from(value);const length=Buffer.alloc(4);length.writeUInt32LE(bytes.length);return Buffer.concat([length,bytes]);}
export function nep413Digest(challenge:Pick<WalletChallenge,"message"|"nonce"|"recipient">){
  const prefix=Buffer.alloc(4);prefix.writeUInt32LE(2147484061);
  const nonce=Buffer.from(challenge.nonce,"base64");if(nonce.length!==32)throw new Error("Invalid challenge nonce.");
  // Borsh message, 32-byte nonce, recipient, and None callback URL; NEP-413 domain tag.
  return createHash("sha256").update(Buffer.concat([prefix,encodedString(challenge.message),nonce,encodedString(challenge.recipient),Buffer.from([0])])).digest();
}
export function createWalletChallenge(origin:string,browserToken:string,now=Date.now()):WalletChallenge{
  const recipient=new URL(origin).origin;
  const challenge={id:randomUUID(),nonce:randomBytes(32).toString("base64"),message:`Sign in to Greed Machine on NEAR testnet. This signature proves wallet ownership and does not authorize transfers.\nOrigin: ${recipient}\nChallenge issued: ${new Date(now).toISOString()}`,recipient,expiresAt:now+300_000};
  transaction(()=>{
    db().prepare("DELETE FROM wallet_challenges WHERE expires_at<=?").run(now);
    db().prepare("DELETE FROM wallet_sessions WHERE expires_at<=?").run(now);
    const pending=db().prepare("SELECT COUNT(*) AS count FROM wallet_challenges").get() as {count:number};
    if(pending.count>=1000)throw new Error("Wallet sign-in is busy. Try again in a few minutes.");
    db().prepare("INSERT INTO wallet_challenges VALUES (?,?,?,?)").run(challenge.id,digest(browserToken),challenge.expiresAt,JSON.stringify(challenge));
  });
  return challenge;
}
export async function authenticateWallet(challengeId:string,browserToken:string,origin:string,signed:unknown,rpc=new GovernanceRpc(),now=Date.now()){
  const input=signedWalletSchema.parse(signed);
  const row=db().prepare("SELECT payload,expires_at,browser_hash FROM wallet_challenges WHERE id=?").get(challengeId) as {payload:string;expires_at:number;browser_hash:string}|undefined;
  if(!row||row.expires_at<=now||row.browser_hash!==digest(browserToken))throw new Error("Wallet challenge expired or does not belong to this browser.");
  const challenge:WalletChallenge=JSON.parse(row.payload);
  if(challenge.recipient!==new URL(origin).origin)throw new Error("Wallet challenge origin does not match.");
  const key=baseDecode(input.publicKey.slice(8));if(key.length!==32)throw new Error("Invalid wallet public key.");
  const publicKey=createPublicKey({key:Buffer.concat([Buffer.from("302a300506032b6570032100","hex"),key]),format:"der",type:"spki"});
  if(!verify(null,nep413Digest(challenge),publicKey,Buffer.from(input.signature,"base64")))throw new Error("Wallet signature did not verify.");
  await rpc.fullAccessKey(input.accountId,input.publicKey);
  const snapshot=await rpc.snapshot();const balance=await rpc.balance(snapshot,input.accountId);
  const token=randomBytes(32).toString("hex"),expiresAt=Date.now()+3_600_000;
  transaction(()=>{
    const used=db().prepare("DELETE FROM wallet_challenges WHERE id=? AND expires_at>? AND browser_hash=?").run(challengeId,Date.now(),digest(browserToken));
    if(used.changes!==1)throw new Error("Wallet challenge has already been used or expired.");
    storeWalletHolder({id:`near:${input.accountId}`,name:input.accountId,balance:Number(balance.rawBalance)/10**snapshot.decimals,rawBalance:balance.rawBalance,auth:"wallet",role:input.accountId===process.env.NEAR_GUARDIAN_ACCOUNT?"Guardian":"Verified wallet",tokenAccount:snapshot.tokenAccount,balanceBlock:snapshot.blockHeight,balanceSnapshot:snapshot});
    db().prepare("INSERT INTO wallet_sessions VALUES (?,?,?,?)").run(digest(token),input.accountId,input.publicKey,expiresAt);
    appendEvent("authentication",input.accountId,"NEP-413 wallet signature verified using a current full-access key. Testnet token balance observed.",{accountId:input.accountId,publicKey:input.publicKey,snapshot,balance});
  });
  return {token,accountId:input.accountId,expiresAt};
}
export function parseWalletSession(token:string|undefined,now=Date.now()){
  if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  const row=db().prepare("SELECT account_id,expires_at FROM wallet_sessions WHERE token_hash=?").get(digest(token)) as {account_id:string;expires_at:number}|undefined;
  return row&&row.expires_at>now?`near:${row.account_id}`:null;
}
export function revokeWalletSession(token:string|undefined){if(token)db().prepare("DELETE FROM wallet_sessions WHERE token_hash=?").run(digest(token));}
export async function requireWalletSession(token:string,rpc=new GovernanceRpc()){
  const holderId=parseWalletSession(token);if(!holderId)throw new Error("Wallet session expired. Verify your wallet again.");
  const row=db().prepare("SELECT public_key FROM wallet_sessions WHERE token_hash=?").get(digest(token)) as {public_key:string};
  await rpc.fullAccessKey(holderId.slice(5),row.public_key);
  if(!parseWalletSession(token))throw new Error("Wallet session expired. Verify your wallet again.");
  return holderId;
}
