import assert from "node:assert/strict";
import { mkdtemp,readFile,mkdir,writeFile,readdir,readlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Sandbox,GenesisAccount } from "near-sandbox";
import { Account,JsonRpcProvider,KeyPair,KeyPairSigner,actions } from "near-api-js";
import { TransactionJournal } from "../src/lib/business/journal";
import { rehearseBusiness } from "./business-rehearsal";

async function main(){
  if(process.argv.includes('--cleanup')){
    // Only this exact harness in this repository; never stop unrelated test servers.
    const processes=await Promise.all((await readdir('/proc')).filter(p=>/^\d+$/.test(p)).map(async p=>{
      try{const [status,command,cwd]=await Promise.all([readFile(`/proc/${p}/status`,'utf8'),readFile(`/proc/${p}/cmdline`,'utf8'),readlink(`/proc/${p}/cwd`)]);return {pid:Number(p),parent:Number(status.match(/^PPid:\s+(\d+)/m)?.[1]),command,cwd};}catch{return null;}
    }));
    const running=processes.filter((p):p is NonNullable<typeof p>=>p!==null);
    const roots=running.filter(p=>p.cwd===process.cwd()&&p.command.includes('scripts/check-business-contract.ts')&&!p.command.includes('--cleanup')).map(p=>p.pid);
    for(const p of running){let parent=p.parent;const seen=new Set<number>();while(parent&&!seen.has(parent)){seen.add(parent);if(roots.includes(parent)){if(/near-sandbox|neard/.test(p.command)){process.kill(p.pid,'SIGKILL');console.log('Stopped this harness’s stale Sandbox child.');}break;}parent=running.find(r=>r.pid===parent)?.parent??0;}}
    return;
  }
  const temporary=await mkdtemp(join(tmpdir(),"greed-business-check-"));
  process.env.DIR_TO_DOWNLOAD_BINARY ||= join(tmpdir(),"greed-near-sandbox-bin");process.env.NEAR_RPC_TIMEOUT_SECS="60";
  const roles=["sponsor","treasury","vault","dollar","token","operator","guardian","provider","alice","bob","carol","reserve"];
  const ids=roles.map(r=>`${r}.testnet`),keys=ids.map(()=>KeyPair.fromRandom("ed25519"));
  const sandbox=await Sandbox.start({config:{additionalAccounts:ids.map((id,i)=>new GenesisAccount(id,keys[i].getPublicKey().toString(),keys[i].toString(),10n**26n))}});
  const provider=new JsonRpcProvider({url:sandbox.rpcUrl});
  const accounts=Object.fromEntries(roles.map((r,i)=>[r,new Account(ids[i],provider,new KeyPairSigner(keys[i]))])) as Record<string,Account>;
  try{
    const restricted=KeyPair.fromRandom("ed25519");
    await accounts.operator.addFunctionCallAccessKey({publicKey:restricted.getPublicKey(),contractId:accounts.treasury.accountId,methodNames:["execute","exit","pay_expense","freeze","pay"],allowance:10n**24n});
    const operator=new Account(accounts.operator.accountId,provider,new KeyPairSigner(restricted));
    const dollar=await readFile("contracts/test-dollar/target/wasm32-unknown-unknown/release/greed_test_dollar.wasm");
    const wasms={treasury:await readFile("contracts/business/target/wasm32-unknown-unknown/release/greed_business.wasm"),vault:await readFile("contracts/demo-vault/target/wasm32-unknown-unknown/release/greed_demo_vault.wasm"),dollar,token:dollar};
    const journal=new TransactionJournal(join(temporary,"transactions.json"),provider,"local-near-sandbox");
    const result=await rehearseBusiness({provider,journal,accounts:{sponsor:accounts.sponsor,treasury:accounts.treasury,vault:accounts.vault,dollar:accounts.dollar,token:accounts.token,operator,guardian:accounts.guardian,provider:accounts.provider,holders:[accounts.alice,accounts.bob,accounts.carol]},wasms,cadenceSeconds:60,negativeChecks:true,progress:console.log});
    // An isolated low-principal treasury makes the reserve rule bind below the spend cap.
    const reserve=accounts.reserve,root=accounts.sponsor;
    const reserveDeploy=await journal.send("reserve-deploy",reserve,reserve.accountId,[actions.deployContract(wasms.treasury),actions.functionCall("new",{token:accounts.dollar.accountId,vault:accounts.vault.accountId,sponsor:root.accountId,operator:root.accountId,guardian:accounts.guardian.accountId,expense_receiver:accounts.provider.accountId,roster:[accounts.alice.accountId],cadence_seconds:60},70_000_000_000_000n,0n)]);
    assert.ok(typeof reserveDeploy.status==="object"&&"SuccessValue" in reserveDeploy.status);
    await journal.send("reserve-registration",root,accounts.dollar.accountId,[actions.functionCall("storage_deposit",{account_id:reserve.accountId,registration_only:true},30_000_000_000_000n,1_250_000_000_000_000_000_000n)]);
    const reserveFunding=await journal.send("reserve-funding",root,accounts.dollar.accountId,[actions.functionCall("ft_transfer_call",{receiver_id:reserve.accountId,amount:"50000000",msg:JSON.stringify({kind:"launch",receipt_id:"reserve-launch"})},100_000_000_000_000n,1n)]);
    assert.ok(typeof reserveFunding.status==="object"&&"SuccessValue" in reserveFunding.status);
    const reserveRefusal=await journal.send("reserve-refusal",root,reserve.accountId,[actions.functionCall("execute",{run_id:"below-cap",receiver_id:accounts.vault.accountId,amount:"50000000",expires_at_ms:String(Date.now()+300000),observed_at_ms:String(Date.now()),proposal_hash:"a".repeat(64)},180_000_000_000_000n,0n)]);
    assert.ok(typeof reserveRefusal.status==="object"&&"Failure" in reserveRefusal.status);
    const reserveState=await provider.callFunction({contractId:reserve.accountId,method:'get_state',args:{},blockQuery:{finality:'final'}}) as {cash:string;reserve_floor:string;max_spend:string;active:string|null};
    assert.equal(reserveState.reserve_floor,'12500000');assert.equal(reserveState.max_spend,'100000000');assert.equal(reserveState.cash,'50000000');assert.equal(reserveState.active,null);
    assert.equal(await provider.callFunction({contractId:accounts.dollar.accountId,method:"ft_balance_of",args:{account_id:reserve.accountId},blockQuery:{finality:"final"}}),"50000000");
    result.reports.push({name:"fixed liquid reserve refuses an allocation below the capital ceiling without moving tokens",passed:true});
    // Simulate losing the response after the chain finalized a signed operation.
    const recoveryPath=join(temporary,"recovery.json");let sends=0;
    const interrupted=Object.create(provider) as JsonRpcProvider;
    interrupted.sendTransactionUntil=async(signed,finality)=>{sends++;await provider.sendTransactionUntil(signed,finality);throw new Error("Lost response after broadcast");};
    const recoveryActions=[actions.functionCall("set_pause",{paused:false},30_000_000_000_000n,0n)];
    await assert.rejects(new TransactionJournal(recoveryPath,interrupted,"local-near-sandbox").send("same-pause",accounts.guardian,accounts.treasury.accountId,recoveryActions),/may have been sent/);
    const recovery=new TransactionJournal(recoveryPath,provider,"local-near-sandbox"),before=await recovery.read();
    const final=await recovery.send("same-pause",accounts.guardian,accounts.treasury.accountId,recoveryActions);
    assert.equal(final.transaction.hash,before.entries[0].hash);assert.equal(sends,1);assert.equal((await recovery.read()).entries[0].status,"final");
    await assert.rejects(recovery.send("same-pause",accounts.guardian,accounts.treasury.accountId,[actions.functionCall("set_pause",{paused:true},30_000_000_000_000n,0n)]),/different transaction/);
    result.reports.push({name:"ambiguous broadcast recovery checks the original hash without signing or sending another transaction",passed:true});
    const forbidden=await operator.createSignedTransaction({receiverId:accounts.provider.accountId,actions:[actions.transfer(1n)]}).then(s=>provider.sendTransactionUntil(s,"FINAL")).catch(()=>null);
    assert.ok(forbidden===null||typeof forbidden.status==="object"&&"Failure" in forbidden.status);result.reports.push({name:"restricted operator key cannot transfer NEAR or call another receiver",passed:true});
    await mkdir("evidence",{recursive:true});await writeFile("evidence/business-sandbox.json",JSON.stringify({...result,reserveEvidence:{treasury:reserve.accountId,principal:"50000000",reserveFloor:"12500000",rejectedCapital:"50000000",transactions:[reserveDeploy,reserveFunding,reserveRefusal].map(tx=>({hash:tx.transaction.hash,status:tx.status,receipts:tx.receipts_outcome}))}},null,2)+"\n");
    console.log(`Compiled business checks passed: ${result.reports.length}. Evidence: evidence/business-sandbox.json`);
  }finally{
    // The pinned Sandbox runner can wait indefinitely for graceful neard shutdown.
    // Escalate only this harness's child; all proof checks finish before cleanup.
    const child=(sandbox as unknown as {childProcess:import('node:child_process').ChildProcess}).childProcess;
    const cleanup=setTimeout(()=>child.kill('SIGKILL'),10000);cleanup.unref();
    try{await sandbox.tearDown();}finally{clearTimeout(cleanup);}
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Business contract check failed.");process.exitCode=1;});
