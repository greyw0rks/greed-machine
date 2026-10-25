import { createHash } from "node:crypto";
import { mkdir,readFile,writeFile,rename,chmod } from "node:fs/promises";
import { dirname } from "node:path";
import { Account,JsonRpcProvider,baseEncode,decodeSignedTransaction,encodeTransaction,type Action } from "near-api-js";

export interface JournalEntry { step:string;requestHash:string;accountId:string;receiverId:string;hash:string;signedBase64:string;status:"prepared"|"unknown"|"final";outcome?:unknown }
export interface Journal { version:1;network:"testnet"|"local-near-sandbox";entries:JournalEntry[] }
export const transactionHash=(transaction:Parameters<typeof encodeTransaction>[0])=>baseEncode(createHash("sha256").update(encodeTransaction(transaction)).digest());
// The file includes signed transactions and must remain ignored, private, and outside the web app.
export class TransactionJournal {
  constructor(readonly path:string,readonly provider:JsonRpcProvider,readonly network:Journal["network"],readonly persist=async(path:string,body:string)=>{
    await mkdir(dirname(path),{recursive:true,mode:0o700});const temporary=`${path}.tmp`;await writeFile(temporary,body,{mode:0o600});await rename(temporary,path);await chmod(path,0o600);
  }){}
  async read():Promise<Journal>{try{const value=JSON.parse(await readFile(this.path,"utf8")) as Journal;if(value.version!==1||value.network!==this.network||!Array.isArray(value.entries))throw new Error("Transaction journal environment mismatch.");return value;}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;return {version:1,network:this.network,entries:[]};}}
  async send(step:string,account:Account,receiverId:string,actions:Action[]){
    const journal=await this.read(),requestHash=createHash("sha256").update(JSON.stringify({accountId:account.accountId,receiverId,actions},(_,v)=>typeof v==="bigint"?v.toString():v)).digest("hex");
    let entry=journal.entries.find(e=>e.step===step);
    if(entry){
      if(entry.requestHash!==requestHash||entry.accountId!==account.accountId||entry.receiverId!==receiverId)throw new Error("Journal step already belongs to a different transaction. Preserve its original plan.");
      const signed=decodeSignedTransaction(Buffer.from(entry.signedBase64,"base64"));if(transactionHash(signed.transaction)!==entry.hash)throw new Error("Journal transaction hash does not match its saved bytes.");
      if(entry.status==="final")return entry.outcome as Awaited<ReturnType<JsonRpcProvider["sendTransactionUntil"]>>;
      // Read the original hash first. Never create a replacement transaction after an ambiguous send.
      try { const outcome=await this.provider.viewTransactionStatus({txHash:entry.hash,accountId:entry.accountId,waitUntil:"FINAL"});entry.status="final";entry.outcome=outcome;await this.persist(this.path,JSON.stringify(journal,null,2));return outcome; }
      catch { throw new Error(`Transaction ${entry.hash} remains unverified. Keep the original journal and run ID; no replacement was signed or broadcast.`); }
    }
    const signed=await account.createSignedTransaction({receiverId,actions});
    entry={step,requestHash,accountId:account.accountId,receiverId,hash:transactionHash(signed.transaction),signedBase64:Buffer.from(encodeTransaction(signed)).toString("base64"),status:"prepared"};journal.entries.push(entry);
    await this.persist(this.path,JSON.stringify(journal,null,2));
    try { const outcome=await this.provider.sendTransactionUntil(signed,"FINAL");entry.status="final";entry.outcome=outcome;await this.persist(this.path,JSON.stringify(journal,null,2));return outcome; }
    catch { entry.status="unknown";await this.persist(this.path,JSON.stringify(journal,null,2));throw new Error(`Transaction ${entry.hash} may have been sent. Resume with the original journal; do not create another run.`); }
  }
}
