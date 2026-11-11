import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const projectFlag=process.argv.indexOf('--project');
const project=projectFlag>=0?process.argv[projectFlag+1]:'videos/greed-walkthrough-2026-11-09';
assert.ok(project?.startsWith('videos/')&&!project.includes('..'),'Use a video project inside videos/.');
const output=`${project}/assets`;
const detailsOnly=process.argv.includes('--details-only');
const prior=detailsOnly?JSON.parse(await readFile(`${output}/capture-manifest.json`,'utf8')):null;
await mkdir(`${output}/recordings`,{recursive:true});
await mkdir(`${output}/screens`,{recursive:true});
const temporary=await mkdtemp(join(tmpdir(),'greed-video-'));
const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
const selectedPort=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const port=Number(process.env.GREED_VIDEO_CHECK_PORT||selectedPort),base=`http://127.0.0.1:${port}`,token=`video-${randomUUID()}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
 env:{...process.env,NODE_OPTIONS:'--dns-result-order=ipv4first',GREED_DB_PATH:join(temporary,'video.sqlite'),FOUNDATION_OPERATOR_TOKEN:token,OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',OPENROUTER_API_KEY:''},stdio:['ignore','pipe','pipe']});
let logs='',browser;server.stdout.on('data',c=>logs+=c);server.stderr.on('data',c=>logs+=c);
const errors=[],shots=[];
try{
 for(let i=0;i<120;i++){try{if((await fetch(`${base}/api/foundation`)).ok)break;}catch{}if(server.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,500));}
 const fallback=join(homedir(),'.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||(existsSync(chromium.executablePath())?chromium.executablePath():fallback);
 assert.ok(existsSync(executablePath),'Install Chromium with npx playwright install chromium, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.');
 const browserEnv={...process.env},localLibraries=join(homedir(),'chrome-libs/usr/lib/x86_64-linux-gnu');
 if(existsSync(localLibraries))browserEnv.LD_LIBRARY_PATH=[localLibraries,browserEnv.LD_LIBRARY_PATH].filter(Boolean).join(':');
 browser=await chromium.launch({headless:true,executablePath,env:browserEnv,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const read=async()=>{const r=await fetch(`${base}/api/foundation`);assert.ok(r.ok);return r.json();};
 const action=async data=>{const r=await fetch(`${base}/api/foundation`,{method:'POST',headers:{Origin:base,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(data)});assert.ok(r.ok,await r.clone().text());return r.json();};
 assert.equal((await read()).config.agentMode,'simulation');
 async function shot(id,route,seconds,prepare,perform){
  if(detailsOnly&&!['security','payouts','proof'].includes(id))return;
  const ctx=await browser.newContext({viewport:{width:1440,height:850},deviceScaleFactor:1,recordVideo:{dir:`${output}/recordings`,size:{width:1440,height:850}},reducedMotion:'reduce'});
  const begun=Date.now(),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  if(prepare)await prepare(page);
  const start=(Date.now()-begun)/1000;
  if(perform)await perform(page);
  await page.screenshot({path:`${output}/screens/${id}.png`});
  await page.waitForTimeout(Math.max(300,seconds*1000-(Date.now()-begun-start*1000)));
  const video=page.video();await ctx.close();const path=`${output}/recordings/${id}.webm`;await video.saveAs(path);
  shots.push({id,path,start,duration:seconds,route});console.log('Captured',id);
 }
 if(detailsOnly){await action({action:'cycle',scenarioId:'steady-yield'});await action({action:'tick'});}
 await shot('welcome','/app',9,null,null);
 await shot('cycle','/app/operator',9,async p=>{await p.getByLabel('Operator token',{exact:true}).fill(token);},async p=>{
  await p.waitForTimeout(750);const started=p.waitForResponse(r=>r.url().includes('/api/foundation')&&r.request().method()==='POST',{timeout:15000});await p.getByRole('button',{name:'Start cycle',exact:true}).click();const startResponse=await started;const startData=await startResponse.json();assert.ok(startResponse.ok(),startData.error||'Cycle action failed');await expect.poll(async()=>(await read()).cycles[0]?.phase,{timeout:15000}).toBe('scouting');
  // Capture public activity after the action; the token field remains password-masked.
  await p.goto(`${base}/app`,{waitUntil:'networkidle'});await p.waitForTimeout(1400);
  await action({action:'tick'});await p.reload({waitUntil:'networkidle'});
 });
 const cycle=(await read()).cycles[0].id;
 await shot('debate',`/app/swarm?cycle=${cycle}`,9,null,async p=>{await p.waitForTimeout(3000);await p.evaluate(()=>window.scrollBy({top:360,behavior:'smooth'}));});
 for(let i=0;i<3;i++)await action({action:'tick'});
 await action({action:'configure',blockedRecipients:['fixture.ada']});
 await action({action:'retry'});
 assert.ok((await read()).distributions[0].entitlements.some(e=>e.status==='failed'));
 await action({action:'cycle',scenarioId:'stale-oracle'});for(let i=0;i<4;i++)await action({action:'tick'});
 const blocked=(await read()).cycles.find(c=>c.scenarioId==='stale-oracle');assert.equal(blocked.phase,'blocked');assert.equal(blocked.evaluation.receipt.capitalMicros,0);
 await shot('security',`/app/risk?cycle=${blocked.id}`,9,async p=>{await p.locator('.security-verdict').scrollIntoViewIfNeeded();},async p=>{await p.waitForTimeout(2700);await p.locator('.check-register article').filter({has:p.locator('.check-icon.failed')}).first().evaluate(e=>e.scrollIntoView({block:'center',behavior:'smooth'}));});
 await shot('payouts','/app/distributions',9,async p=>{await p.locator('.entitlement-row').first().scrollIntoViewIfNeeded();},async p=>{await p.waitForTimeout(2500);await p.goto(`${base}/app/operator`,{waitUntil:'networkidle'});await p.getByLabel('Operator token',{exact:true}).fill(token);await p.getByLabel(/Simulate an unavailable receiver/).selectOption('');await expect.poll(async()=>(await read()).config.blockedRecipients.length).toBe(0);await p.getByRole('button',{name:'Process payout batch',exact:true}).click();await expect.poll(async()=>(await read()).pendingMicros).toBe(0);await p.goto(`${base}/app/distributions`,{waitUntil:'networkidle'});await p.locator('.entitlement-row').first().scrollIntoViewIfNeeded();});
 await shot('proof','/testnet',9,null,async p=>{await expect(p.getByText('11 checks passed in the saved rehearsal',{exact:true})).toBeVisible();await p.waitForTimeout(3700);await p.getByRole('heading',{name:'Transaction evidence',exact:true}).evaluate(e=>e.scrollIntoView({block:'start',behavior:'smooth'}));});
 await shot('results','/testnet',11,async p=>{await p.getByText('The reconciled accounts',{exact:true}).scrollIntoViewIfNeeded();},null);
 let observation=prior?.observation;
 let verificationWaitSeconds=0;
 await shot('verify','/testnet',9,null,async p=>{
  const result=p.waitForResponse(r=>r.url().includes('/api/business?live=1'),{timeout:90000});
  const requestStart=Date.now();await p.getByRole('button',{name:'Verify on NEAR testnet',exact:true}).click();const response=await result;verificationWaitSeconds=(Date.now()-requestStart)/1000;const data=await response.json();
  await writeFile(`${output}/live-verification-response.json`,JSON.stringify(data,null,2)+'\n');
  assert.ok(response.ok(),data.error||'Read-only verification failed');assert.equal(data.observation?.reconciled,true);observation=data.observation;
  await expect(p.getByText('Finalized treasury balances reconcile',{exact:true})).toBeVisible();await p.waitForTimeout(5000);
 });
 const ledger=await read();assert.equal(ledger.auditValid,true);assert.equal(ledger.reconciled,true);assert.equal(errors.length,0,errors.join('\n'));
 const merged=prior?prior.shots.map(s=>shots.find(n=>n.id===s.id)||s):shots;
 await writeFile(`${output}/capture-manifest.json`,JSON.stringify({createdAt:new Date().toISOString(),temporaryDatabase:'isolated temporary SQLite ledger',simulation:true,source:'actual application browser interactions; NEAR observation is read-only',verificationWaitSeconds,shots:merged,errors,observation},null,2)+'\n');
 console.log('Read-only finalized verification passed at block',observation.blockHeight);
}finally{await browser?.close();server.kill('SIGTERM');await writeFile(join(temporary,'server.log'),logs);}
