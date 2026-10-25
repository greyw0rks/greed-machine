import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

// A separate server and database keep browser verification away from the demo ledger.
const port=Number(process.env.GREED_FOUNDATION_CHECK_PORT||3114);
const base=`http://127.0.0.1:${port}`,token=`browser-fixture-${randomUUID()}`;
const temporary=await mkdtemp(join(tmpdir(),'greed-foundation-browser-'));
const dir='.impeccable/review';await mkdir(dir,{recursive:true});
let providerFault=false;const providerRequests=[];
// The provider is local and deterministic; browser checks never use paid API credentials.
const provider=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>256000){res.writeHead(413).end();return;}}
  const body=JSON.parse(raw),system=body.messages[0].content,name=system.split(', a ')[0].replace('You are ','');providerRequests.push(name);
  let value;
  if(system.includes('proposal defender')||name==='Adversarial analyst')value={reasoning:'The allocation and exit assumptions remain subject to independent limits.'};
  else if(name==='Risk guardian')value={reasoning:'The liquid proposal preserves the current mandate and exit limits.',preferredVenue:'lending'};
  else if(name==='Final portfolio selector')value={proposalId:JSON.parse(body.messages[1].content).proposals[0].id,reasoning:'Choose the unchanged liquid proposal after considering the challenge.'};
  else if(name==='Independent security reviewer')value={approved:true,reasoning:'The fixture receiver and hard controls permit this bounded action.'};
  else value={venue:name==='Momentum scout'?'staking':'lending',amountUsd:20000,confidence:.8,reason:'A bounded fixture proposal that preserves the reserve and acknowledges exit risk.'};
  const unknown=providerFault&&name==='Risk guardian';if(unknown)providerFault=false;
  res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({id:`browser-response-${providerRequests.length}`,usage:unknown?null:{prompt_tokens:100,completion_tokens:10},choices:[{message:{content:JSON.stringify(value)}}]}));
});
await new Promise((resolve,reject)=>{provider.once('error',reject);provider.listen(0,'127.0.0.1',resolve);});
const providerPort=provider.address().port;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
  env:{...process.env,GREED_DB_PATH:join(temporary,'foundation.sqlite'),FOUNDATION_OPERATOR_TOKEN:token,OPENAI_API_KEY:'browser-provider-fixture-key',OPENAI_BASE_URL:`http://127.0.0.1:${providerPort}`,OPENAI_INPUT_USD_PER_MILLION:'1',OPENAI_OUTPUT_USD_PER_MILLION:'2'},
  stdio:['ignore','pipe','pipe']
});
let logs='',browser;
server.stdout.on('data',chunk=>{logs+=chunk;});server.stderr.on('data',chunk=>{logs+=chunk;});
const errors=[],reports=[];
try {
  const deadline=Date.now()+60000;
  while(true){
    if(server.exitCode!==null)throw new Error(`Isolated server exited: ${logs}`);
    try{const response=await fetch(`${base}/api/foundation`,{signal:AbortSignal.timeout(1000)});if(response.ok)break;}catch{}
    if(Date.now()>deadline)throw new Error(`Isolated server did not start: ${logs}`);
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  const installedFallback='/home/greyw0rks/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
  const executablePath=process.env.CHROMIUM_PATH||(existsSync(chromium.executablePath())?chromium.executablePath():existsSync(installedFallback)?installedFallback:undefined);
  browser=await chromium.launch({
    ...(executablePath?{executablePath}:{}),headless:true,
    env:{...process.env,LD_LIBRARY_PATH:`/home/greyw0rks/chrome-libs/usr/lib/x86_64-linux-gnu:${process.env.LD_LIBRARY_PATH||''}`},
    args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
  });
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(`${page.url()}: ${error.message}`));
  const read=async()=>{const response=await context.request.get(`${base}/api/foundation`);assert.equal(response.status(),200);return response.json();};
  const action=async body=>{
    const response=await context.request.post(`${base}/api/foundation`,{headers:{Origin:base,Authorization:`Bearer ${token}`},data:body});
    assert.equal(response.status(),200,await response.text());return response.json();
  };
  const anonymous=await context.request.post(`${base}/api/foundation`,{headers:{Origin:base},data:{action:'cycle',scenarioId:'steady-yield'}});
  assert.equal(anonymous.status(),401);
  const crossOrigin=await context.request.post(`${base}/api/foundation`,{headers:{Origin:'https://unrelated.example',Authorization:`Bearer ${token}`},data:{action:'tick'}});
  assert.equal(crossOrigin.status(),403);
  const initial=await read();assert.equal(initial.cycles.length,0);
  await page.goto(`${base}/app`,{waitUntil:'networkidle'});
  await expect(page.getByText('The foundation is ready for its first cycle.',{exact:true})).toBeVisible();
  assert.equal((await read()).engine.sequence,0,'Public reads must not start business cycles.');
  await page.goto(`${base}/app/operator`,{waitUntil:'networkidle'});
  await page.getByLabel('Operator token',{exact:true}).fill(token);
  await page.getByRole('button',{name:'Start cycle',exact:true}).click();
  await expect.poll(async()=>(await read()).cycles[0]?.phase).toBe('scouting');
  for(const phase of ['debating','security','funded','settled']){
    await expect(page.getByRole('button',{name:'Advance one phase',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'Advance one phase',exact:true}).click();
    await expect.poll(async()=>(await read()).cycles[0]?.phase).toBe(phase);
  }
  let data=await read();assert.equal(data.distributions.length,1);assert.ok(data.pendingMicros>0);
  const snapshot=structuredClone(data.distributions[0].snapshot),cycleId=data.cycles[0].id;
  await page.getByLabel(/^Simulate an unavailable receiver/).selectOption('fixture.ada');
  await expect.poll(async()=>(await read()).config.blockedRecipients[0]).toBe('fixture.ada');
  await expect(page.getByRole('button',{name:'Process payout batch',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Process payout batch',exact:true}).click();
  await expect.poll(async()=>(await read()).distributions[0].entitlements.filter(e=>e.status==='failed').length).toBe(1);
  data=await read();const paidOnce=data.engine.distributedMicros;
  data=await action({action:'retry'});assert.equal(data.engine.distributedMicros,paidOnce);
  await page.getByLabel(/^Holder share · simulation/).selectOption('6000');
  await expect.poll(async()=>(await read()).config.holderBps).toBe(6000);
  assert.deepEqual((await read()).distributions[0].snapshot,snapshot);
  assert.equal((await read()).distributions[0].holderBps,6500);
  await action({action:'pause',paused:true});
  data=await action({action:'retry'});assert.equal(data.engine.distributedMicros,paidOnce);
  await action({action:'configure',blockedRecipients:[]});await action({action:'pause',paused:false});
  data=await action({action:'retry'});assert.equal(data.pendingMicros,0);
  const paid=data.engine.distributedMicros,receipts=data.distributions[0].entitlements.map(e=>e.receipt);
  data=await action({action:'retry'});assert.equal(data.engine.distributedMicros,paid);assert.deepEqual(data.distributions[0].entitlements.map(e=>e.receipt),receipts);
  const watermark=data.engine.profitWatermarkMicros;
  for(const scenarioId of ['rate-reversal','stale-oracle']){
    await action({action:'cycle',scenarioId});
    for(let i=0;i<4;i++)await action({action:'tick'});
  }
  data=await read();assert.equal(data.engine.profitWatermarkMicros,watermark);assert.equal(data.distributions.length,1);
  const blocked=data.cycles.find(c=>c.scenarioId==='stale-oracle');assert.equal(blocked.phase,'blocked');
  assert.equal(blocked.evaluation.receipt.capitalMicros,0);assert.ok(data.cycles.find(c=>c.scenarioId==='rate-reversal').netMicros<0);
  assert.equal(data.auditValid,true);assert.equal(data.reconciled,true);
  console.log('Verified cycle phases, loss recovery and payout retries');
  const beforeModel=data.engine.totalNetMicros;providerFault=true;
  await page.goto(`${base}/app/operator`,{waitUntil:'networkidle'});await page.getByLabel('Operator token',{exact:true}).fill(token);
  await page.getByLabel(/^Agent mode/).selectOption('model');await expect.poll(async()=>(await read()).config.agentMode).toBe('model');
  await page.getByRole('button',{name:'Start cycle',exact:true}).click();await expect.poll(async()=>(await read()).cycles[0]?.phase).toBe('scouting');
  await page.getByRole('button',{name:'Advance one phase',exact:true}).click();await expect.poll(async()=>(await read()).cycles[0]?.phase).toBe('failed');
  data=await read();const uncertain=data.modelCalls.find(c=>c.status==='uncertain');assert.ok(uncertain);
  assert.equal(data.engine.totalNetMicros,beforeModel-240);assert.equal(data.accountingComplete,false);assert.equal(data.engine.paused,true);
  assert.equal(providerRequests.length,3);await expect(page.getByRole('button',{name:'Resume operations',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Allocate eligible profit',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Check worker recovery',exact:true}).click();assert.equal(providerRequests.length,3);
  await page.setViewportSize({width:390,height:844});
  for(const [name,route] of [['provider-recovery','/app/operator'],['provider-audit','/app/audit']]){
    await page.goto(base+route,{waitUntil:'networkidle'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=390);
    const path=`${dir}/foundation-${name}-390.png`;await page.screenshot({path,fullPage:true});reports.push({name,width:390,documentWidth:390,path});
  }
  await expect(page.getByRole('heading',{name:'Provider accounting pending.',exact:true})).toBeVisible();
  await page.goto(`${base}/app/operator`,{waitUntil:'networkidle'});await page.getByLabel('Operator token',{exact:true}).fill(token);
  await page.getByLabel('Confirmed provider cost · USD',{exact:true}).fill('0.000345');
  await page.getByLabel('Supporting evidence',{exact:true}).fill('Local fixture invoice confirms 345 microdollars for this request.');
  await page.getByRole('button',{name:'Record confirmed cost',exact:true}).click();
  await expect.poll(async()=>(await read()).accountingComplete).toBe(true);
  data=await read();assert.equal(data.engine.totalNetMicros,beforeModel-585);assert.equal(data.engine.paused,true);
  const duplicate=await context.request.post(`${base}/api/foundation`,{headers:{Origin:base,Authorization:`Bearer ${token}`},data:{action:'resolve-model-call',callId:uncertain.id,costMicros:345,evidence:'Duplicate fixture reconciliation must not charge again.'}});
  assert.equal(duplicate.status(),400);assert.equal((await read()).engine.totalNetMicros,beforeModel-585);
  await page.getByRole('button',{name:'Resume operations',exact:true}).click();await expect.poll(async()=>(await read()).engine.paused).toBe(false);
  await action({action:'tick'});assert.equal(providerRequests.length,3);await action({action:'configure',agentMode:'simulation'});
  data=await read();assert.equal(data.reconciled,true);assert.equal(data.auditValid,true);assert.equal(JSON.stringify(data).includes('browser-provider-fixture-key'),false);
  console.log('Verified unknown provider cost, operator reconciliation and no automatic paid replay');
  await page.goto(`${base}/app/swarm?cycle=${cycleId}`,{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:'Steady yield',exact:true})).toBeVisible();
  assert.ok(await page.locator('.debate-entry').count()>0);
  await page.goto(`${base}/app/audit`,{waitUntil:'networkidle'});
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export evidence',exact:true}).click();
  const download=await downloaded;assert.equal(download.suggestedFilename(),'greed-foundation-evidence.json');
  await download.saveAs(`${dir}/foundation-evidence.json`);
  await page.route('**/api/foundation',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Fixture offline'})}));
  const errorNotice=page.locator('.notice[role="alert"]');
  await expect(errorNotice).toContainText('Activity could not refresh.',{timeout:15000});
  await expect(page.getByText('Event chain intact. Accounts reconciled.',{exact:true})).toBeVisible();
  await page.unroute('**/api/foundation');await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(errorNotice).toHaveCount(0);
  const routes=[['landing','/'],['activity','/app'],['swarm',`/app/swarm?cycle=${cycleId}`],['security',`/app/risk?cycle=${blocked.id}`],['distributions','/app/distributions'],['audit','/app/audit'],['governance','/app/governance'],['operator','/app/operator']];
  for(const width of [1440,390])for(const [name,route] of routes){
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.emulateMedia({reducedMotion:name==='landing'&&width===1440?'no-preference':'reduce'});
    await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    if(name==='landing'){
      await page.locator('canvas').waitFor({state:'attached',timeout:15000});assert.equal(await page.locator('canvas').count(),1);
      if(width===390){await expect(page.getByRole('button',{name:'Motion reduced',exact:true})).toBeDisabled();await expect(page.locator('.scene-canvas')).toHaveAttribute('data-motion','paused');}
      else await expect(page.getByRole('button',{name:'Pause 3D animation',exact:true})).toBeEnabled();
    }
    const documentWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(documentWidth<=width,`${name} overflow ${documentWidth} > ${width}`);
    const path=`${dir}/foundation-${name}-${width}.png`;await page.screenshot({path,fullPage:true});reports.push({name,width,documentWidth,path});
    console.log('Captured',name,width);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  const result={passed:true,errors,reports,assertions:['public reads never start cycles','operator authentication and origin checks','four phase transitions through UI','loss recovery','blocked funding','immutable snapshot and split','failed receiver retry and pause','duplicate payout prevention','unknown provider cost pauses payouts','operator invoice reconciliation','duplicate invoice rejection','no automatic paid replay','provider recovery and audit mobile captures','audit export','refresh outage recovery','16 desktop/mobile route captures','WebGL canvas','reduced-motion hydration and paused animation']};
  await writeFile(`${dir}/foundation-browser-results.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({passed:true,captures:reports.length,errors},null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');await writeFile(join(temporary,'server.log'),logs);
  await new Promise(resolve=>provider.close(resolve));
}
