import { spawn } from 'node:child_process';
import { mkdtemp,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

const directory=await mkdtemp(join(tmpdir(),'greed-business-ui-'));
const port=Number(process.env.GREED_BUSINESS_CHECK_PORT||3115),base=`http://127.0.0.1:${port}`;
const evidence='docs/demo-assets',results=[],errors=[];
let logs='';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,GREED_DB_PATH:join(directory,'test.sqlite'),OPENAI_API_KEY:'',FOUNDATION_OPERATOR_TOKEN:'isolated-business-ui-check'},stdio:['ignore','pipe','pipe']});
server.stdout.on('data',chunk=>{logs=(logs+chunk).slice(-4000);});server.stderr.on('data',chunk=>{logs=(logs+chunk).slice(-4000);});
let browser;
try{
  let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw new Error(`Isolated production server exited: ${logs}`);try{if((await fetch(`${base}/testnet`,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw new Error(`Isolated production server did not become ready: ${logs}`);
  const fallback=join(homedir(),'.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
  const executablePath=process.env.CHROMIUM_PATH||(existsSync(chromium.executablePath())?chromium.executablePath():existsSync(fallback)?fallback:undefined);
  browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),env:{...process.env,LD_LIBRARY_PATH:`${join(homedir(),'chrome-libs/usr/lib/x86_64-linux-gnu')}:${process.env.LD_LIBRARY_PATH||''}`},args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});await mkdir(evidence,{recursive:true});
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/testnet`,{waitUntil:'networkidle'});
    if(await page.locator('h1').innerText()!=='Follow a complete money cycle.')throw new Error('Business proof heading is missing.');
    if(await page.getByText(/gUSD is an unbacked demonstration token/).count()!==1)throw new Error('Demo-token evidence boundary is missing.');
    if(await page.getByText(/checks passed in the saved rehearsal/).count()!==1)throw new Error('Completed Sandbox/testnet evidence did not render.');
    await page.screenshot({path:`${evidence}/business-overview-${width}.png`});
    await page.locator('details').first().locator('summary').click();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    if(overflow)throw new Error(`Proof page overflows at ${width}px.`);
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo({top:0,behavior:'instant'});});
    await page.screenshot({path:`${evidence}/business-proof-${width}.png`,fullPage:true});results.push({route:'/testnet',width,passed:true});
    await page.goto(`${base}/app`,{waitUntil:'networkidle'});if(await page.getByRole('link',{name:'NEAR proof',exact:true}).count()!==1)throw new Error('Foundation does not link to the NEAR proof.');
    await page.getByRole('link',{name:'NEAR proof',exact:true}).click();await page.waitForURL('**/testnet');results.push({route:'navigation to /testnet',width,passed:true});await page.close();
  }
  if(errors.length)throw new Error('Browser reported page errors.');
  await writeFile(`${evidence}/business-browser-results.json`,JSON.stringify({passed:true,environment:'isolated-production-server',source:'saved compiled-contract evidence',results,errors},null,2)+'\n');console.log(`Business UI passed ${results.length} desktop/mobile checks. Screenshots: ${evidence}`);
}finally{await browser?.close();server.kill('SIGTERM');}
