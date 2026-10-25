import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

test("the scheduled worker uses Next env files and respects explicit database overrides",()=>{
  const directory=mkdtempSync(join(tmpdir(),"greed-worker-env-"));
  const local=join(directory,"configured.sqlite"),override=join(directory,"override.sqlite");
  writeFileSync(join(directory,".env.local"),`GREED_DB_PATH=${local}\n`);
  const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:"development"};delete env.GREED_DB_PATH;
  const run=(values:NodeJS.ProcessEnv)=>{
    const result=spawnSync(process.execPath,["--import",resolve("node_modules/tsx/dist/loader.mjs"),resolve("scripts/foundation-worker.ts"),"--once"],{
      cwd:directory,env:values,encoding:"utf8",timeout:20000
    });
    assert.equal(result.status,0,result.stderr||result.error?.message||"Worker failed.");
  };
  run(env);assert.equal(existsSync(local),true);assert.equal(existsSync(join(directory,"data","greed.sqlite")),false);
  run({...env,GREED_DB_PATH:override});assert.equal(existsSync(override),true);
});
