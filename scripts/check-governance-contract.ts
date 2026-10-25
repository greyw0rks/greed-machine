import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir,readFile,writeFile,mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Sandbox,GenesisAccount } from "near-sandbox";
import { Account,JsonRpcProvider,KeyPair,KeyPairSigner,actions } from "near-api-js";
import { GovernanceRpc } from "../src/lib/near-governance";
import { authenticateWallet,createWalletChallenge } from "../src/lib/wallet-auth";
import { createGovernance,vote,finalizeGovernance,executeGovernance,governanceProposals } from "../src/lib/database";

async function main(){
  process.env.GREED_DB_PATH=join(await mkdtemp(join(tmpdir(),"greed-token-check-")),"test.sqlite");
  process.env.DIR_TO_DOWNLOAD_BINARY ||= join(tmpdir(),"greed-near-sandbox-bin");
  process.env.NEAR_RPC_TIMEOUT_SECS ||= "60";
  const wasm=await readFile("contracts/test-token/target/wasm32-unknown-unknown/release/greed_test_token.wasm");
  const ids=["token.testnet","alice.testnet","bob.testnet","guardian.testnet"],keys=ids.map(()=>KeyPair.fromRandom("ed25519"));
  const sandbox=await Sandbox.start({config:{additionalAccounts:ids.map((id,i)=>new GenesisAccount(id,keys[i].getPublicKey().toString(),keys[i].toString(),10n**26n))}});
  const provider=new JsonRpcProvider({url:sandbox.rpcUrl}),accounts=ids.map((id,i)=>new Account(id,provider,new KeyPairSigner(keys[i])));
  const [token,alice,bob]=accounts,reports:{name:string;passed:boolean}[]=[];
  async function check(name:string,fn:()=>Promise<void>){await fn();reports.push({name,passed:true});console.log("Passed:",name);}
  try{
    await check("compiled token initializes once with a fixed million-token supply",async()=>{
      await token.signAndSendTransaction({receiverId:token.accountId,waitUntil:"FINAL",actions:[actions.deployContract(wasm),actions.functionCall("new",{holders:[[ids[1],"250000"],[ids[2],"400000"],[ids[3],"350000"]]},50_000_000_000_000n,0n)]});
      assert.equal(await provider.callFunction({contractId:ids[0],method:"ft_total_supply",args:{},blockQuery:{finality:"final"}}),"1000000");
      await assert.rejects(alice.callFunction({contractId:ids[0],methodName:"new",args:{holders:[]}}));
    });
    const deployed=await provider.viewAccount({accountId:ids[0],blockQuery:{finality:"final"}});
    process.env.NEAR_GREED_TOKEN_ACCOUNT=ids[0];process.env.NEAR_GREED_TOKEN_CODE_HASH=deployed.code_hash;
    // Only this local harness maps Sandbox's network identity. Production rejects non-testnet RPCs.
    const request:typeof fetch=async(url,init)=>{
      if(JSON.parse(String(init?.body)).method==="status")return Response.json({result:{chain_id:"testnet",sync_info:{syncing:false}}});
      return fetch(url,init);
    };
    const rpc=new GovernanceRpc(sandbox.rpcUrl,request);
    await check("real account keys and compiled NEP-141 views authenticate NEP-413 signers",async()=>{
      for(const account of [alice,bob]){
        const origin="http://localhost:3014",challenge=createWalletChallenge(origin,account.accountId);
        const signer=new KeyPairSigner(keys[ids.indexOf(account.accountId)]);
        const signed=await signer.signNep413Message(account.accountId,{message:challenge.message,recipient:challenge.recipient,nonce:Buffer.from(challenge.nonce,"base64")});
        await authenticateWallet(challenge.id,account.accountId,origin,{accountId:account.accountId,publicKey:signed.publicKey.toString(),signature:Buffer.from(signed.signature).toString("base64")},rpc);
      }
    });
    const snapshot=await rpc.snapshot(),now=Date.now();
    const proposal=createGovernance("Sandbox holder mandate","Compiled token balances fix the vote weights.",{maxSpendMicros:15000e6,maxExposureBps:2000,minReserveBps:4000},`near:${alice.accountId}`,now,snapshot);
    await check("transfers after the snapshot cannot change proposal voting weight",async()=>{
      await alice.callFunction({contractId:ids[0],methodName:"ft_transfer",args:{receiver_id:bob.accountId,amount:"100000"},deposit:1n,waitUntil:"FINAL"});
      assert.equal(await provider.callFunction({contractId:ids[0],method:"ft_balance_of",args:{account_id:alice.accountId},blockQuery:{finality:"final"}}),"150000");
      const a=await rpc.balance(snapshot,alice.accountId),b=await rpc.balance(snapshot,bob.accountId);
      assert.equal(a.rawBalance,"250000");assert.equal(b.rawBalance,"400000");
      vote(proposal.id,`near:${alice.accountId}`,"for",now+1,a);vote(proposal.id,`near:${bob.accountId}`,"for",now+1,b);
      assert.throws(()=>vote(proposal.id,`near:${alice.accountId}`,"for",now+1,a));
    });
    await check("compiled-token votes satisfy quorum and the full local mandate timelock",async()=>{
      assert.throws(()=>finalizeGovernance(proposal.id,now+299999));finalizeGovernance(proposal.id,now+300001);
      assert.throws(()=>executeGovernance(proposal.id,now+360000));executeGovernance(proposal.id,now+360002);
      assert.equal(governanceProposals()[0].status,"executed");
    });
    await check("fixture has no post-initialization mint entrypoint",async()=>{
      await assert.rejects(token.callFunction({contractId:ids[0],methodName:"mint",args:{account_id:alice.accountId,amount:"1"}}));
    });
    await mkdir("evidence",{recursive:true});await writeFile("evidence/governance-sandbox.json",JSON.stringify({environment:"local-near-sandbox",networkIdentityAdapter:"status only; real compiled token/account queries",wasmSha256:createHash("sha256").update(wasm).digest("hex"),passed:true,reports,snapshot},null,2)+"\n");
  }finally{await sandbox.tearDown();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
