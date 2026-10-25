import { configureFoundation, foundationData, payDistributions, requestCycle, tickFoundation } from "../src/lib/foundation/store";
import { SCENARIOS } from "../src/lib/scenarios";
import { loadEnvConfig } from "@next/env";
async function main(){
  // Match the web app's env-file precedence before opening the lazy SQLite connection.
  loadEnvConfig(process.cwd(),process.env.NODE_ENV!=="production");
  if(process.argv.includes("--seed")){
    if(foundationData().cycles.length){console.log("Foundation already has cycles; seed skipped.");return;}
    for(const id of ["steady-yield","rate-reversal","stale-oracle","staking-rally"]){requestCycle(id);for(let i=0;i<4;i++)await tickFoundation(true);payDistributions();}
    console.log("Four foundation scenarios and their distribution receipts persisted.");return;
  }
  if(process.argv.includes("--once")){await tickFoundation(true);payDistributions();return;}
  if(process.argv.includes("--enable"))configureFoundation({enabled:true});
  let stopping=false;process.on("SIGINT",()=>{stopping=true;});process.on("SIGTERM",()=>{stopping=true;});
  console.log(`Foundation worker online. ${SCENARIOS.length} fixture scenarios; no real funds or token dependency.`);
  while(!stopping){try{const result=await tickFoundation();if(result.worked)console.log(new Date().toISOString(),result.phase);payDistributions();}catch(error){console.error(error instanceof Error?error.message:error);}await new Promise(resolve=>setTimeout(resolve,1000));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
