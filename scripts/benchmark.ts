import { evaluateScenario } from "../src/lib/agents";
import { GENESIS_MANDATE, INITIAL_BALANCE, SCENARIOS } from "../src/lib/scenarios";
const rows=await Promise.all(SCENARIOS.map(async scenario=>{
  const [swarm,single,noTrade]=await Promise.all(["swarm","single","no-trade"].map(mode=>evaluateScenario(scenario,GENESIS_MANDATE,INITIAL_BALANCE,mode as "swarm"|"single"|"no-trade")));
  return {scenario:scenario.id,swarmNetUsd:swarm.receipt.netMicros/1e6,singleNetUsd:single.receipt.netMicros/1e6,noTradeNetUsd:noTrade.receipt.netMicros/1e6,swarmCostUsd:swarm.receipt.agentCostMicros/1e6,swarmDrawdownPercent:swarm.receipt.drawdownBps/100};
}));
console.log(JSON.stringify({environment:"simulation",startingCapitalUsd:100000,rows},null,2));
