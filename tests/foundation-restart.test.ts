import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import type { FoundationData } from "../src/lib/foundation/types";

test("fresh worker processes recover a funded position, expired lease and unpaid receipts exactly once",()=>{
  const path=join(mkdtempSync(join(tmpdir(),"greed-restart-")),"foundation.sqlite");
  function worker(step:string):FoundationData {
    const script=`import { foundationData, requestCycle, tickFoundation, configureFoundation, payDistributions } from './src/lib/foundation/store.ts';
      import { db } from './src/lib/database.ts';
      ${step}
      console.log(JSON.stringify(foundationData()));`;
    const result=spawnSync(process.execPath,["--import","tsx","--input-type=module","--eval",script],{
      cwd:process.cwd(),env:{...process.env,GREED_DB_PATH:path},encoding:"utf8",timeout:20000
    });
    assert.equal(result.status,0,result.stderr||result.error?.message||"Worker process failed.");
    return JSON.parse(result.stdout);
  }
  worker("requestCycle('steady-yield');");
  for(let i=0;i<2;i++)worker("await tickFoundation(true);");
  let data=worker("await tickFoundation(true);");
  assert.equal(data.cycles[0].phase,"funded");assert.ok(data.engine.reservedMicros>0);
  const cycleId=data.cycles[0].id;
  worker(`const state=foundationData().engine;state.leaseOwner='dead-worker';state.leaseUntil=Date.now()-1;
    db().prepare("UPDATE foundation_meta SET payload=? WHERE key='state'").run(JSON.stringify(state));`);
  data=worker("await tickFoundation(true);configureFoundation({blockedRecipients:['fixture.ada']});payDistributions();");
  assert.equal(data.cycles[0].id,cycleId);assert.equal(data.cycles[0].phase,"settled");
  assert.equal(data.engine.reservedMicros,0);assert.equal(data.distributions.length,1);assert.ok(data.pendingMicros>0);
  const partial=data.engine.distributedMicros;
  data=worker("payDistributions();");assert.equal(data.engine.distributedMicros,partial);
  data=worker("configureFoundation({blockedRecipients:[]});payDistributions();");
  assert.equal(data.pendingMicros,0);assert.equal(data.distributions[0].status,"complete");
  const paid=data.engine.distributedMicros,receipts=data.distributions[0].entitlements.map(e=>e.receipt);
  data=worker("await tickFoundation(true);payDistributions();");
  assert.equal(data.cycles.length,1);assert.equal(data.distributions.length,1);
  assert.equal(data.engine.distributedMicros,paid);assert.deepEqual(data.distributions[0].entitlements.map(e=>e.receipt),receipts);
  assert.equal(data.reconciled,true);assert.equal(data.auditValid,true);
});
