import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KeyPair, KeyPairSigner } from "near-api-js";
import { governanceFixture,codeHash,blockHash } from "./helpers/governance-rpc";
import { authenticateWallet,createWalletChallenge,parseWalletSession,revokeWalletSession,requireWalletSession } from "../src/lib/wallet-auth";
import { createGovernance, vote,finalizeGovernance,executeGovernance,governanceProposals,storeWalletHolder,setPause,db,verifyAudit } from "../src/lib/database";
import { formatTokens,tokenPercent } from "../src/lib/token-amounts";

process.env.GREED_DB_PATH=join(mkdtempSync(join(tmpdir(),"greed-wallet-tests-")),"test.sqlite");
process.env.NEAR_GREED_TOKEN_ACCOUNT="token.testnet";
process.env.NEAR_GREED_TOKEN_CODE_HASH=codeHash;
const origin="http://localhost:3014";
async function signedChallenge(accountId="alice.testnet"){
  const fixture=governanceFixture(),key=KeyPair.fromRandom("ed25519"),signer=new KeyPairSigner(key);
  fixture.state.keys[accountId]=key.getPublicKey().toString();
  const challenge=createWalletChallenge(origin,"browser");
  // Independent SDK serializer and signer exercise interoperability, not our digest helper.
  const signed=await signer.signNep413Message(accountId,{message:challenge.message,recipient:challenge.recipient,nonce:Buffer.from(challenge.nonce,"base64")});
  return {...fixture,challenge,signed:{accountId,publicKey:signed.publicKey.toString(),signature:Buffer.from(signed.signature).toString("base64")}};
}
test("SDK NEP-413 signatures establish expiring, revocable server sessions and cannot replay",async()=>{
  const f=await signedChallenge();
  const session=await authenticateWallet(f.challenge.id,"browser",origin,f.signed,f.rpc);
  assert.equal(parseWalletSession(session.token),"near:alice.testnet");
  assert.equal(parseWalletSession(session.token,session.expiresAt),null);
  assert.equal(parseWalletSession(session.token.slice(1)),null);
  await assert.rejects(authenticateWallet(f.challenge.id,"browser",origin,f.signed,f.rpc));
  assert.equal(await requireWalletSession(session.token,f.rpc),"near:alice.testnet");
  f.state.keys={};await assert.rejects(requireWalletSession(session.token,f.rpc));
  revokeWalletSession(session.token);assert.equal(parseWalletSession(session.token),null);
  assert.equal(verifyAudit(),true);
});
test("signatures reject tampering, wrong browser, origin, expired challenge and account substitution",async()=>{
  const f=await signedChallenge();
  await assert.rejects(authenticateWallet(f.challenge.id,"other",origin,f.signed,f.rpc));
  await assert.rejects(authenticateWallet(f.challenge.id,"browser","http://evil.example",f.signed,f.rpc));
  await assert.rejects(authenticateWallet(f.challenge.id,"browser",origin,f.signed,f.rpc,f.challenge.expiresAt));
  await assert.rejects(authenticateWallet(f.challenge.id,"browser",origin,{...f.signed,accountId:"bob.testnet"},f.rpc));
  await assert.rejects(authenticateWallet(f.challenge.id,"browser",origin,{...f.signed,signature:Buffer.alloc(64).toString("base64")},f.rpc));
  assert.equal(f.state.calls.filter(c=>c.method==="status").length,1,"invalid signatures must not trigger RPC work");
});
test("function-call keys and non-testnet RPCs cannot authenticate wallets",async()=>{
  const f=await signedChallenge();f.state.permission={FunctionCall:{receiver_id:"token.testnet",method_names:[]}};
  await assert.rejects(authenticateWallet(f.challenge.id,"browser",origin,f.signed,f.rpc),/full-access/);
  f.state.permission="FullAccess";f.state.chain="mainnet";
  await assert.rejects(authenticateWallet(f.challenge.id,"browser",origin,f.signed,f.rpc),/testnet/);
});
test("concurrent challenge submissions create exactly one session",async()=>{
  const f=await signedChallenge();
  const outcomes=await Promise.allSettled([1,2].map(()=>authenticateWallet(f.challenge.id,"browser",origin,f.signed,f.rpc)));
  assert.equal(outcomes.filter(x=>x.status==="fulfilled").length,1);
});
test("token snapshot pins code, block, supply and historical balances; failures stay closed",async()=>{
  const f=governanceFixture(),snapshot=await f.rpc.snapshot();
  assert.equal(snapshot.codeHash,codeHash);assert.equal(snapshot.blockHash,blockHash);
  assert.equal((await f.rpc.balance(snapshot,"alice.testnet")).rawBalance,"250000");
  assert.ok(f.state.calls.filter(c=>c.request_type==="call_function").every(c=>c.block_id===blockHash));
  f.state.queryHash=codeHash;await assert.rejects(f.rpc.balance(snapshot,"alice.testnet"),/pinned/);
  f.state.queryHash=blockHash;f.state.codeHash=blockHash;await assert.rejects(f.rpc.snapshot(),/configured build/);
  f.state.codeHash=codeHash;await assert.rejects(f.rpc.snapshot("token.testnet",""),/pinned/);
  f.state.timestamp=Date.now()-600000;await assert.rejects(f.rpc.snapshot(),/stale/);
  f.state.timestamp=Date.now();f.state.supply="0";await assert.rejects(f.rpc.snapshot(),/eligible supply/);
  f.state.balances["alice.testnet"]="1000001";await assert.rejects(f.rpc.balance(snapshot,"alice.testnet"),/exceeds/);
});
test("wallet ballots isolate demo identities and enforce exact quorum, majority and timelock",async()=>{
  const f=governanceFixture();f.state.supply="1000000000000000000000001";f.state.decimals=24;
  const snapshot=await f.rpc.snapshot(),now=Date.now(),change={maxSpendMicros:15000e6,maxExposureBps:2000,minReserveBps:4000};
  for(const id of ["alice.testnet","bob.testnet"])storeWalletHolder({id:`near:${id}`,name:id,balance:1,role:"Verified wallet",auth:"wallet"});
  assert.throws(()=>createGovernance("Bad wallet","missing snapshot",change,"near:alice.testnet"));
  assert.throws(()=>createGovernance("Bad demo","wallet snapshot",change,"ada",now,snapshot));
  const p=createGovernance("Precise quorum","Snapshot near the rounding boundary",change,"near:alice.testnet",now,snapshot);
  assert.throws(()=>vote(p.id,"ada","for",now+1));
  assert.throws(()=>vote(p.id,"near:alice.testnet","for",now+1,{rawBalance:"0",blockHash}));
  assert.throws(()=>vote(p.id,"near:alice.testnet","for",now+1,{rawBalance:"5",blockHash:codeHash}));
  vote(p.id,"near:alice.testnet","for",now+1,{rawBalance:"500000000000000000000000",blockHash});
  assert.throws(()=>vote(p.id,"near:alice.testnet","against",now+1,{rawBalance:"1",blockHash}));
  assert.throws(()=>finalizeGovernance(p.id,now+299999));
  finalizeGovernance(p.id,now+300001);
  assert.equal(governanceProposals().find(v=>v.id===p.id)!.status,"rejected","one raw unit below 50% must fail despite float rounding");
  const passed=createGovernance("Exact pass","Add the unit needed for quorum",change,"near:alice.testnet",now,snapshot);
  vote(passed.id,"near:alice.testnet","for",now+1,{rawBalance:"500000000000000000000001",blockHash});
  const read=governanceProposals().find(v=>v.id===passed.id)!;assert.equal(read.votes[0].rawBalance,"500000000000000000000001");
  finalizeGovernance(passed.id,now+300001);assert.throws(()=>executeGovernance(passed.id,now+360000));executeGovernance(passed.id,now+360002);assert.throws(()=>executeGovernance(passed.id,now+360003));
  const demo=createGovernance("Demo vote","Uses synthetic demo identities",change,"ada",now);
  assert.throws(()=>vote(demo.id,"near:alice.testnet","for",now+1,{rawBalance:"1",blockHash}));
  assert.equal(verifyAudit(),true);
});
test("wallet guardian has separate pause authority and UI formatting preserves raw units",()=>{
  process.env.NEAR_GUARDIAN_ACCOUNT="guardian.testnet";
  assert.throws(()=>setPause(true,"near:alice.testnet"));setPause(true,"near:guardian.testnet");setPause(false,"near:guardian.testnet");
  assert.equal(formatTokens("1000000000000000000000001",24),"1.000000000000000000000001");
  assert.equal(formatTokens("250000",0),"250,000");assert.equal(tokenPercent("1","3"),33.33);
  const row=db().prepare("SELECT COUNT(*) AS count FROM wallet_weights").get() as {count:number};assert.ok(row.count>=2);
});
