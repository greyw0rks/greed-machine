import assert from "node:assert/strict";
import { createHash,randomUUID } from "node:crypto";
import { chmod,mkdir,readFile,writeFile } from "node:fs/promises";
import { Account,JsonRpcProvider,KeyPair,KeyPairSigner,actions,baseEncode } from "near-api-js";
import { GovernanceRpc } from "../src/lib/near-governance";
import { TransactionJournal } from "../src/lib/business/journal";
import { rehearseBusiness } from "./business-rehearsal";
import { reportSchema,observeBusiness } from "../src/lib/business/report";

const rpcUrl="https://rpc.testnet.near.org",credentialPath=".near/business-credentials.json",reportPath="evidence/business-testnet.json";
const roles=["treasury","vault","dollar","token","operator","guardian","provider","alice","bob","carol"] as const;
type Credentials={root:string;rootKey:string;keys:Record<typeof roles[number],string>;restrictedKey:string};
async function main(){
  const deploy=process.argv.includes("--deploy"),verify=process.argv.includes("--verify");
  const dollar=await readFile("contracts/test-dollar/target/wasm32-unknown-unknown/release/greed_test_dollar.wasm");
  const wasms={treasury:await readFile("contracts/business/target/wasm32-unknown-unknown/release/greed_business.wasm"),vault:await readFile("contracts/demo-vault/target/wasm32-unknown-unknown/release/greed_demo_vault.wasm"),dollar,token:dollar};
  await mkdir(".near",{recursive:true,mode:0o700});let credentials:Credentials;
  try{credentials=JSON.parse(await readFile(credentialPath,"utf8"));}
  catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;credentials={root:`greed-biz-${randomUUID().slice(0,8)}.testnet`,rootKey:KeyPair.fromRandom("ed25519").toString(),keys:Object.fromEntries(roles.map(r=>[r,KeyPair.fromRandom("ed25519").toString()])) as Credentials["keys"],restrictedKey:KeyPair.fromRandom("ed25519").toString()};await writeFile(credentialPath,JSON.stringify(credentials,null,2)+"\n",{flag:"wx",mode:0o600});}
  await chmod(credentialPath,0o600);assert.match(credentials.root,/^greed-biz-[a-f0-9]{8}\.testnet$/);
  const accountIds=Object.fromEntries(roles.map(r=>[r,`${r}.${credentials.root}`])) as Record<typeof roles[number],string>;
  const balances=Object.fromEntries(roles.map(r=>[r,r in wasms?BigInt(wasms[r as keyof typeof wasms].length)*10n**19n+250_000_000_000_000_000_000_000n:r==="operator"?300_000_000_000_000_000_000_000n:70_000_000_000_000_000_000_000n])) as Record<typeof roles[number],bigint>;
  const funding=Object.values(balances).reduce((s,a)=>s+a,200_000_000_000_000_000_000_000n);
  const plan={network:"testnet",purpose:"bounded-business-token-rehearsal",root:credentials.root,accounts:accountIds,contractBuilds:Object.fromEntries(Object.entries(wasms).map(([r,w])=>[r,{bytes:w.length,codeHash:baseEncode(createHash("sha256").update(w).digest())}])),maximumSetupNearYocto:funding.toString(),asset:"gUSD: unbacked demo token, six decimals",launch:"1000 gUSD",fee:"5 gUSD fixture",expense:"2 gUSD fixture",position:"100 gUSD",return:"110 gUSD (sponsor-funded fixture)",holderPool:"8.45 gUSD",retained:"4.55 gUSD",cadenceSeconds:60,operatorKey:"Receiver- and method-restricted NEAR function-call key",credentials:credentialPath};
  await writeFile(".near/business-plan.json",JSON.stringify(plan,null,2)+"\n");console.log(JSON.stringify(plan,null,2));if(!deploy&&!verify)return;
  const rpc=new GovernanceRpc(rpcUrl);await rpc.testnet();
  if(verify){const saved=reportSchema.parse(JSON.parse(await readFile(reportPath,"utf8")));const observation=await observeBusiness(saved,rpc);assert.ok(observation.reconciled);await writeFile("evidence/business-testnet-observation.json",JSON.stringify(observation,null,2)+"\n");console.log("Existing public business proof independently verified; no transactions signed.");return;}
  try{const existing=reportSchema.parse(JSON.parse(await readFile(reportPath,"utf8")));assert.equal(existing.accounts.sponsor,credentials.root);assert.ok((await observeBusiness(existing,rpc)).reconciled);console.log("Rehearsal already complete. No additional transaction sent.");return;}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  const provider=new JsonRpcProvider({url:rpcUrl}),signer=(key:string)=>KeyPairSigner.fromSecretKey(key as `ed25519:${string}`);
  const sponsor=new Account(credentials.root,provider,signer(credentials.rootKey)),accounts=Object.fromEntries(roles.map(r=>[r,new Account(accountIds[r],provider,signer(credentials.keys[r]))])) as Record<typeof roles[number],Account>;
  const journal=new TransactionJournal(".near/business-transactions.json",provider,"testnet");
  let rootState;
  try{rootState=await provider.viewAccount({accountId:sponsor.accountId,blockQuery:{finality:"final"}});}
  catch(e){if(!/UNKNOWN_ACCOUNT|does not exist|UnknownAccount/i.test(e instanceof Error?e.message:String(e)))throw e;const key=KeyPair.fromString(credentials.rootKey as `ed25519:${string}`).getPublicKey().toString();const response=await fetch("https://helper.testnet.near.org/account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({newAccountId:sponsor.accountId,newAccountPublicKey:key}),signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`Faucet unavailable (HTTP ${response.status}). Fund the dedicated testnet account ${sponsor.accountId} with public key ${key}, then resume the same plan.`);rootState=await provider.viewAccount({accountId:sponsor.accountId,blockQuery:{finality:"final"}});}
  const missing:string[]=[];for(const r of roles){try{await provider.viewAccount({accountId:accountIds[r],blockQuery:{finality:"final"}});}catch(e){if(!/UNKNOWN_ACCOUNT|does not exist|UnknownAccount/i.test(e instanceof Error?e.message:String(e)))throw e;missing.push(r);}}
  const required=missing.reduce((n,r)=>n+balances[r as typeof roles[number]],200_000_000_000_000_000_000_000n);if(BigInt(rootState.amount)<required)throw new Error(`Dedicated testnet setup needs ${required} yoctoNEAR; ${sponsor.accountId} holds ${rootState.amount}. Add faucet test NEAR and resume this same plan. No company or mainnet funds are used.`);
  for(const r of roles){
    const step=`create-${r}`;if(!missing.includes(r)&&!(await journal.read()).entries.some(e=>e.step===step))throw new Error("An existing child account lacks its creation evidence.");
    const tx=await journal.send(step,sponsor,accountIds[r],[actions.createAccount(),actions.transfer(balances[r]),actions.addFullAccessKey(KeyPair.fromString(credentials.keys[r] as `ed25519:${string}`).getPublicKey())]);assert.ok(typeof tx.status==="object"&&"SuccessValue" in tx.status);
  }
  const restricted=KeyPair.fromString(credentials.restrictedKey as `ed25519:${string}`);
  const keyTx=await journal.send("install-restricted-operator-key",accounts.operator,accounts.operator.accountId,[actions.addFunctionCallAccessKey(restricted.getPublicKey(),accounts.treasury.accountId,["execute","exit","pay_expense","freeze","pay"],200_000_000_000_000_000_000_000n)]);assert.ok(typeof keyTx.status==="object"&&"SuccessValue" in keyTx.status);
  const operator=new Account(accounts.operator.accountId,provider,new KeyPairSigner(restricted));
  const report=await rehearseBusiness({provider,journal,accounts:{sponsor,treasury:accounts.treasury,vault:accounts.vault,dollar:accounts.dollar,token:accounts.token,operator,guardian:accounts.guardian,provider:accounts.provider,holders:[accounts.alice,accounts.bob,accounts.carol]},wasms,cadenceSeconds:60,negativeChecks:false,progress:console.log});
  reportSchema.parse(report);assert.ok((await observeBusiness(reportSchema.parse(report),rpc)).reconciled);
  await mkdir("evidence",{recursive:true});await writeFile(reportPath,JSON.stringify({...report,setupPlan:plan},null,2)+"\n");console.log(`Public business cycle verified. Evidence: ${reportPath}`);
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Testnet business proof failed.");process.exitCode=1;});
