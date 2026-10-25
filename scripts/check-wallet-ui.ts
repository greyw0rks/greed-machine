import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp,mkdir,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KeyPair,KeyPairSigner } from "near-api-js";
import { governanceFixture,codeHash } from "../tests/helpers/governance-rpc";

async function main(){
  const fixture=governanceFixture(),keys={"alice.testnet":KeyPair.fromRandom("ed25519"),"bob.testnet":KeyPair.fromRandom("ed25519")};
  for(const [id,key] of Object.entries(keys))fixture.state.keys[id]=key.getPublicKey().toString();
  const rpc=createServer(async(req,res)=>{
    let body="";for await(const chunk of req)body+=chunk;
    fixture.state.timestamp=Date.now();
    const response=await fixture.request("http://fixture.invalid",{body,method:"POST"});
    res.setHeader("Content-Type","application/json");res.end(await response.text());
  });
  rpc.listen(0,"127.0.0.1");await once(rpc,"listening");
  const rpcPort=(rpc.address() as {port:number}).port,port=Number(process.env.GREED_WALLET_CHECK_PORT||3024),base=`http://localhost:${port}`;
  const dir=".impeccable/review",temp=await mkdtemp(join(tmpdir(),"greed-wallet-browser-"));await mkdir(dir,{recursive:true});
  const app=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{env:{...process.env,GREED_DB_PATH:join(temp,"browser.sqlite"),NEAR_RPC_URL:`http://127.0.0.1:${rpcPort}`,NEAR_GREED_TOKEN_ACCOUNT:"token.testnet",NEAR_GREED_TOKEN_CODE_HASH:codeHash,DEMO_SESSIONS_ENABLED:"true",COOKIE_SECURE:"false"},stdio:["ignore","pipe","pipe"]});
  let appLog="";app.stdout.on("data",v=>{appLog+=v});app.stderr.on("data",v=>{appLog+=v});
  let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  try{
    let ready=false;
    for(let i=0;i<60;i++){
      if(app.exitCode!==null)throw new Error(`Check server exited: ${appLog}`);
      try{const response=await fetch(`${base}/api/machine`);if(response.ok){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    assert.ok(ready,appLog);
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/home/greyw0rks/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",headless:true,env:{...process.env,LD_LIBRARY_PATH:`/home/greyw0rks/chrome-libs/usr/lib/x86_64-linux-gnu:${process.env.LD_LIBRARY_PATH||""}`},args:["--no-sandbox","--disable-dev-shm-usage"]});
    const errors:string[]=[],reports:{width:number;account:string;passed:boolean}[]=[];
    let proposalId="";
    for(const [width,accountId] of [[1440,"alice.testnet"],[390,"bob.testnet"]] as const){
      const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:"reduce"});
      await context.route(/raw\.githubusercontent\.com|cdn\.jsdelivr\.net/,route=>route.fulfill({json:{wallets:[],version:"1.0.0"}}));
      await context.exposeBinding("greedTestSign",async(_source,params:{message:string;recipient:string;nonce:number[]})=>{
        const signed=await new KeyPairSigner(keys[accountId]).signNep413Message(accountId,{...params,nonce:Uint8Array.from(params.nonce)});
        return {accountId,publicKey:signed.publicKey.toString(),signature:Buffer.from(signed.signature).toString("base64")};
      });
      await context.addInitScript(({accountId})=>{
        window.addEventListener("near-selector-ready",()=>window.dispatchEvent(new CustomEvent("near-wallet-injected",{detail:{
          manifest:{id:"greed-check-wallet",name:"Local verification wallet",website:"https://example.invalid",icon:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",features:{testnet:true,signInAndSignMessage:true},permissions:{}},
          async signInAndSignMessage({messageParams}:{messageParams:{message:string;recipient:string;nonce:Uint8Array}}){
            const signer=(window as unknown as {greedTestSign:(params:unknown)=>Promise<unknown>}).greedTestSign;
            return [{accountId,signedMessage:await signer({...messageParams,nonce:Array.from(messageParams.nonce)})}];
          },
          async signOut(){},async getAccounts(){return [{accountId}]}
        }})));
      },{accountId});
      const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
      await page.goto(`${base}/app/governance`,{waitUntil:"networkidle"});
      await page.getByRole("button",{name:"Connect wallet"}).click();
      await page.getByRole("button",{name:"Verify testnet wallet",exact:true}).click();
      await page.getByText("Local verification wallet",{exact:true}).click();
      await page.getByRole("button",{name:new RegExp(`${accountId}.*verified wallet`)}).waitFor();
      assert.equal((await (await context.request.get(`${base}/api/machine`)).json()).holder.id,`near:${accountId}`);
      const cookies=await context.cookies();assert.ok(cookies.find(c=>c.name==="greed_wallet_session"&&c.httpOnly&&c.sameSite==="Strict"));
      if(!proposalId){
        await page.getByRole("button",{name:"Propose mandate",exact:true}).click();
        await page.getByRole("button",{name:"Open five-minute wallet vote"}).click();
        await page.getByText("NEAR testnet snapshot · block 12,345",{exact:true}).waitFor();
        const state=await (await context.request.get(`${base}/api/machine`)).json();proposalId=state.governance[0].id;
      }
      await page.getByRole("button",{name:"Vote for",exact:true}).click();
      await page.getByText("Your snapshot vote is recorded",{exact:true}).waitFor();
      await page.getByText("NEAR testnet snapshot · block 12,345",{exact:true}).click();
      const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export snapshot and ballots"}).click();assert.ok((await download).suggestedFilename().includes(proposalId));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=width);
      await page.screenshot({path:`${dir}/wallet-governance-${width}.png`,fullPage:true});
      const headers={Origin:base};
      const duplicate=await context.request.post(`${base}/api/machine`,{headers,data:{action:"vote",proposalId,choice:"for"}});assert.equal(duplicate.status(),400);
      const early=await context.request.post(`${base}/api/machine`,{headers,data:{action:"finalize",proposalId}});assert.equal(early.status(),400);
      const csrf=await context.request.post(`${base}/api/wallet`,{headers:{Origin:"https://wrong.example"},data:{action:"challenge"}});assert.equal(csrf.status(),403);
      await page.getByRole("button",{name:new RegExp(`${accountId}.*verified wallet`)}).click();
      const logoutResponse=page.waitForResponse(response=>response.url().endsWith("/api/machine")&&response.request().method()==="POST");
      await page.getByRole("button",{name:"Sign out",exact:true}).click();
      const logout=await logoutResponse;assert.equal(logout.status(),200,await logout.text());
      assert.equal((await logout.json()).state.holder,null,"sign-out response clears identity");
      await page.getByRole("button",{name:"Connect wallet",exact:true}).waitFor();
      const denied=await context.request.post(`${base}/api/machine`,{headers,data:{action:"vote",proposalId,choice:"against"}});assert.equal(denied.status(),401);
      reports.push({width,account:accountId,passed:true});console.log("Passed wallet browser flow:",width,accountId);await context.close();
    }
    const state=await (await fetch(`${base}/api/machine`)).json();assert.equal(state.governance[0].votes.reduce((n:number,v:{weight:number})=>n+v.weight,0),650000);
    assert.deepEqual(errors,[]);
    await writeFile(`${dir}/wallet-browser-results.json`,JSON.stringify({passed:true,environment:"local RPC fixture and injected verification wallet; real NEP-413 cryptography",reports,errors},null,2)+"\n");
    if(process.argv.includes("--demo")){
      const demo=spawn(process.execPath,["scripts/check-ui.mjs"],{env:{...process.env,GREED_BASE_URL:base,GREED_CHECK_NEAR:"false"},stdio:"inherit"});
      const [code]=await once(demo,"exit");assert.equal(code,0,"Existing demo browser flow");
    }
  }finally{
    await browser?.close();app.kill("SIGTERM");if(app.exitCode===null)await once(app,"exit");rpc.close();
    await writeFile(join(temp,"server.log"),appLog);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
