import { z } from "zod";
import type { TokenSnapshot } from "./types";

export const nearAccountSchema=z.string().min(2).max(64).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const hash=z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const uint=z.string().regex(/^(0|[1-9]\d*)$/).refine(v=>BigInt(v)<2n**128n);
export function walletConfigured(){return Boolean(nearAccountSchema.safeParse(process.env.NEAR_GREED_TOKEN_ACCOUNT).success&&process.env.NEAR_GREED_TOKEN_ACCOUNT?.endsWith('.testnet')&&hash.safeParse(process.env.NEAR_GREED_TOKEN_CODE_HASH).success);}
export class GovernanceRpc {
  constructor(readonly url=process.env.NEAR_RPC_URL||"https://rpc.testnet.near.org",readonly request:typeof fetch=fetch){}
  async rpc(method:string,params:unknown):Promise<unknown>{
    const response=await this.request(this.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:"greed-governance",method,params}),signal:AbortSignal.timeout(12_000),cache:"no-store"});
    if(!response.ok)throw new Error("NEAR governance RPC is unavailable.");
    const body=z.object({result:z.unknown().optional(),error:z.unknown().optional()}).parse(await response.json());
    if(body.error||body.result===undefined)throw new Error("NEAR could not verify the account or token snapshot.");
    return body.result;
  }
  async testnet(){const status=z.object({chain_id:z.literal("testnet"),sync_info:z.object({syncing:z.literal(false)})}).safeParse(await this.rpc("status",[]));if(!status.success)throw new Error("Governance requires a synced NEAR testnet RPC.");}
  async view(tokenAccount:string,method:string,args:Record<string,unknown>,blockHash:string){
    const value=z.object({result:z.array(z.number().int().min(0).max(255)),block_hash:hash}).parse(await this.rpc("query",{request_type:"call_function",account_id:tokenAccount,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString("base64"),block_id:blockHash}));
    if(value.block_hash!==blockHash)throw new Error("Token query did not use the pinned snapshot block.");
    return JSON.parse(Buffer.from(value.result).toString("utf8")) as unknown;
  }
  async snapshot(tokenAccount=process.env.NEAR_GREED_TOKEN_ACCOUNT,expectedHash=process.env.NEAR_GREED_TOKEN_CODE_HASH):Promise<TokenSnapshot>{
    if(!tokenAccount||!nearAccountSchema.safeParse(tokenAccount).success||!tokenAccount.endsWith(".testnet"))throw new Error("A testnet governance token contract must be configured.");
    await this.testnet();
    const state=z.object({code_hash:hash,block_hash:hash,block_height:z.number().int().positive().safe()}).parse(await this.rpc("query",{request_type:"view_account",account_id:tokenAccount,finality:"final"}));
    if(!expectedHash||!hash.safeParse(expectedHash).success)throw new Error("A pinned governance token code hash must be configured.");
    if(state.code_hash!==expectedHash)throw new Error("Governance token code does not match its configured build.");
    const [metadataValue,supplyValue,blockValue]=await Promise.all([this.view(tokenAccount,"ft_metadata",{},state.block_hash),this.view(tokenAccount,"ft_total_supply",{},state.block_hash),this.rpc("block",{block_id:state.block_hash})]);
    const metadata=z.object({spec:z.literal("ft-1.0.0"),symbol:z.literal("GREED"),decimals:z.number().int().min(0).max(24)}).parse(metadataValue);
    const totalSupply=uint.parse(supplyValue);if(BigInt(totalSupply)===0n)throw new Error("Governance token has no eligible supply.");
    const block=z.object({header:z.object({hash,height:z.number().int().positive().safe(),timestamp_nanosec:z.string().regex(/^\d+$/)})}).parse(blockValue);
    if(block.header.hash!==state.block_hash||block.header.height!==state.block_height)throw new Error("Snapshot block evidence does not match.");
    const timestamp=Number(BigInt(block.header.timestamp_nanosec)/1_000_000n);
    if(!Number.isSafeInteger(timestamp)||timestamp>Date.now()+30_000||timestamp<Date.now()-120_000)throw new Error("The finalized governance snapshot is stale. Try again with a synced RPC.");
    return {environment:"testnet",tokenAccount,codeHash:state.code_hash,blockHash:state.block_hash,blockHeight:state.block_height,timestamp,totalSupply,decimals:metadata.decimals,symbol:metadata.symbol};
  }
  async balance(snapshot:TokenSnapshot,accountId:string){
    nearAccountSchema.parse(accountId);
    const rawBalance=uint.parse(await this.view(snapshot.tokenAccount,"ft_balance_of",{account_id:accountId},snapshot.blockHash));
    if(BigInt(rawBalance)>BigInt(snapshot.totalSupply))throw new Error("Snapshot balance exceeds its eligible supply.");
    return {rawBalance,blockHash:snapshot.blockHash};
  }
  async fullAccessKey(accountId:string,publicKey:string){
    await this.testnet();
    const key=z.object({permission:z.literal("FullAccess")}).safeParse(await this.rpc("query",{request_type:"view_access_key",account_id:accountId,public_key:publicKey,finality:"final"}));
    if(!key.success)throw new Error("Wallet authentication requires a current full-access account key.");
  }
}
