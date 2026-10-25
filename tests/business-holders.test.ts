import test from "node:test";
import assert from "node:assert/strict";
import { reconstructHolders,createHolderSnapshot,type TokenEvent } from "../src/lib/business/holders";

const mint:TokenEvent={receiptId:"mint-receipt",logIndex:0,event:"ft_mint",data:[{owner_id:"alice.testnet",amount:"1000000"}]};
const transfer:TokenEvent={receiptId:"transfer-receipt",logIndex:0,event:"ft_transfer",data:[{old_owner_id:"alice.testnet",new_owner_id:"bob.testnet",amount:"350000"}]};
test("holder reconstruction follows token transfers and deduplicates receipt logs",()=>{
  assert.deepEqual(reconstructHolders([mint,transfer,transfer]).holders,[{account_id:"alice.testnet",weight:"650000"},{account_id:"bob.testnet",weight:"350000"}]);
  assert.throws(()=>reconstructHolders([mint,transfer,{...transfer,data:[{old_owner_id:"alice.testnet",new_owner_id:"bob.testnet",amount:"1"}]}]),/Conflicting/);
  assert.throws(()=>reconstructHolders([transfer]),/balance/);
});
test("holder snapshot must reconcile its complete supply and every pinned balance",()=>{
  const metadata={tokenAccount:"token.testnet",codeHash:"1".repeat(32),blockHash:"2".repeat(32),blockHeight:10,totalSupply:"1000000"};
  const snapshot=createHolderSnapshot([mint,transfer],metadata,{"alice.testnet":"650000","bob.testnet":"350000"});assert.match(snapshot.hash,/^[a-f0-9]{64}$/);
  assert.throws(()=>createHolderSnapshot([mint,transfer],metadata,{"alice.testnet":"1000000","bob.testnet":"0"}),/disagree/);
  assert.throws(()=>createHolderSnapshot([mint,transfer],{...metadata,totalSupply:"1000001"},{"alice.testnet":"650000","bob.testnet":"350000"}),/full token supply/);
});
