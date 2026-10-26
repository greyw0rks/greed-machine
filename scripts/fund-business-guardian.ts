import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Account,JsonRpcProvider,KeyPairSigner,actions } from "near-api-js";
import { TransactionJournal } from "../src/lib/business/journal";
import { GovernanceRpc } from "../src/lib/near-governance";

// Use 0.13 test NEAR of the existing 0.2 setup buffer. Keep this native-gas
// funding separate from demo-token principal, fees, profit and expenses.
async function main(){
const credentials=JSON.parse(await readFile(".near/business-credentials.json","utf8"));
assert.equal(credentials.root,"greed-biz-1584eb30.testnet");
await new GovernanceRpc("https://rpc.testnet.near.org").testnet();
const provider=new JsonRpcProvider({url:"https://rpc.testnet.near.org"});
const sponsor=new Account(credentials.root,provider,KeyPairSigner.fromSecretKey(credentials.rootKey));
const journal=new TransactionJournal(".near/business-gas-transactions.json",provider,"testnet");
const result=await journal.send("guardian-gas-buffer",sponsor,`guardian.${credentials.root}`,[actions.transfer(130_000_000_000_000_000_000_000n)]);
assert.ok(typeof result.status==="object"&&"SuccessValue" in result.status);
console.log(JSON.stringify({purpose:"guardian native-gas setup buffer",network:"testnet",amountNear:"0.13",transactionHash:result.transaction.hash}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Guardian gas funding failed.");process.exitCode=1;});
