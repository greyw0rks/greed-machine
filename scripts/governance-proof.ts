import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile,writeFile,mkdir,chmod } from "node:fs/promises";
import { Account,JsonRpcProvider,KeyPair,KeyPairSigner,actions,baseEncode } from "near-api-js";
import { GovernanceRpc,nearAccountSchema } from "../src/lib/near-governance";

const rpcUrl="https://rpc.testnet.near.org",credentialsPath=".near/token-credentials.json",evidencePath="evidence/governance-testnet.json";
interface TokenCredentials {accountId:string;privateKey:string;holder:string}
async function main(){
  const deploy=process.argv.includes("--deploy"),verify=process.argv.includes("--verify");
  const holderIndex=process.argv.indexOf("--holder"),requestedHolder=holderIndex<0?undefined:process.argv[holderIndex+1];
  const parent=JSON.parse(await readFile(".near/proof-credentials.json","utf8")) as {accountId:string;privateKey:string;guardianId:string};
  assert.ok(parent.accountId.endsWith(".testnet"),"Faucet-funded testnet operator required");
  const wasm=await readFile("contracts/test-token/target/wasm32-unknown-unknown/release/greed_test_token.wasm");
  const codeHash=baseEncode(createHash("sha256").update(wasm).digest());
  let credentials:TokenCredentials;
  try{credentials=JSON.parse(await readFile(credentialsPath,"utf8"));}
  catch(error){
    if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    assert.ok(requestedHolder,"Pass --holder with the intended user's NEAR testnet account");
    nearAccountSchema.parse(requestedHolder);
    credentials={accountId:`token.${parent.accountId}`,privateKey:KeyPair.fromRandom("ed25519").toString(),holder:requestedHolder};
    await writeFile(credentialsPath,JSON.stringify(credentials,null,2)+"\n",{mode:0o600,flag:"wx"});
  }
  await chmod(credentialsPath,0o600);
  if(requestedHolder)assert.equal(credentials.holder,requestedHolder,"Existing token allocation belongs to another holder");
  assert.equal(credentials.accountId,`token.${parent.accountId}`);nearAccountSchema.parse(credentials.accountId);nearAccountSchema.parse(credentials.holder);
  const holders:[[string,string],[string,string],[string,string]]=[[credentials.holder,"650000"],[parent.accountId,"250000"],[parent.guardianId,"100000"]];
  assert.equal(new Set(holders.map(([id])=>id)).size,3,"Fixture needs three distinct accounts");
  const plan={network:"testnet",purpose:"fixed-supply-governance-demo",account:credentials.accountId,codeHash,wasmBytes:wasm.length,totalSupply:"1000000",decimals:0,holders,funding:"3 faucet-funded testnet NEAR from the existing proof operator",treasurySettlement:"synthetic",credentialsPath};
  await writeFile(".near/token-plan.json",JSON.stringify(plan,null,2)+"\n");console.log(JSON.stringify(plan,null,2));
  if(!deploy&&!verify)return;
  const rpc=new GovernanceRpc(rpcUrl);await rpc.testnet();
  const provider=new JsonRpcProvider({url:rpcUrl}),operator=new Account(parent.accountId,provider,KeyPairSigner.fromSecretKey(parent.privateKey as `ed25519:${string}`));
  const token=new Account(credentials.accountId,provider,KeyPairSigner.fromSecretKey(credentials.privateKey as `ed25519:${string}`));
  const transactions:{step:string;hash:string}[]=[];
  try{const previous=JSON.parse(await readFile(evidencePath,"utf8"));assert.equal(previous.account,plan.account);assert.equal(previous.codeHash,codeHash);transactions.push(...previous.transactions);}
  catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
  const checkpoint=async()=>{await mkdir("evidence",{recursive:true});await writeFile(evidencePath,JSON.stringify({...plan,transactions,completed:false},null,2)+"\n");};
  if(deploy){
    // Verify every recipient exists on testnet before any write.
    for(const [accountId] of holders)await provider.viewAccount({accountId,blockQuery:{finality:"final"}});
    let state;
    try{state=await provider.viewAccount({accountId:credentials.accountId,blockQuery:{finality:"final"}});}
    catch(error){
      if(!/does not exist|UNKNOWN_ACCOUNT|UnknownAccount/i.test(error instanceof Error?error.message:String(error)))throw error;
      const parentState=await provider.viewAccount({accountId:parent.accountId,blockQuery:{finality:"final"}});
      const funding=3n*10n**24n;
      assert.ok(BigInt(parentState.amount)-BigInt(parentState.storage_usage)*10n**19n>funding+10n**23n,"Insufficient faucet-funded balance; refusing to spend the operator's storage reserve");
      const tx=await operator.signAndSendTransaction({receiverId:credentials.accountId,waitUntil:"FINAL",actions:[actions.createAccount(),actions.transfer(funding),actions.addFullAccessKey(KeyPair.fromString(credentials.privateKey as `ed25519:${string}`).getPublicKey())]});
      transactions.push({step:"create-token-subaccount",hash:tx.transaction.hash});await checkpoint();
      state=await provider.viewAccount({accountId:credentials.accountId,blockQuery:{finality:"final"}});
    }
    assert.ok(state.code_hash==="11111111111111111111111111111111"||state.code_hash===codeHash,"Refusing to overwrite a different token contract");
    if(state.code_hash!==codeHash){
      const tx=await token.signAndSendTransaction({receiverId:token.accountId,waitUntil:"FINAL",actions:[actions.deployContract(wasm),actions.functionCall("new",{holders},50_000_000_000_000n,0n)]});
      transactions.push({step:"deploy-and-initialize-token",hash:tx.transaction.hash});await checkpoint();
    }
  }
  const snapshot=await rpc.snapshot(credentials.accountId,codeHash);
  assert.equal(snapshot.totalSupply,"1000000");assert.equal(snapshot.decimals,0);
  const balances=await Promise.all(holders.map(async([accountId,initialAllocation])=>({accountId,initialAllocation,...await rpc.balance(snapshot,accountId)})));
  // A deployment run verifies initial allocation. Later read-only checks allow legitimate transfers.
  if(deploy)for(const balance of balances)assert.equal(balance.rawBalance,balance.initialAllocation);
  await writeFile(evidencePath,JSON.stringify({...plan,transactions,completed:true,verifiedAt:new Date().toISOString(),snapshot,balances},null,2)+"\n");
  await writeFile(".near/governance.env",`NEAR_GREED_TOKEN_ACCOUNT=${credentials.accountId}\nNEAR_GREED_TOKEN_CODE_HASH=${codeHash}\nNEAR_GUARDIAN_ACCOUNT=${parent.guardianId}\n`);
  console.log("Verified finalized token supply and balances:",balances.map(v=>`${v.accountId}: ${v.rawBalance}`).join(", "));
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
