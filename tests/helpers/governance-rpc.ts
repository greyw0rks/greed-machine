import { GovernanceRpc } from "../../src/lib/near-governance";

export const blockHash="11111111111111111111111111111111";
export const codeHash="22222222222222222222222222222222";
export function governanceFixture(){
  const state={chain:"testnet",permission:"FullAccess" as unknown,codeHash,queryHash:blockHash,supply:"1000000",decimals:0,timestamp:Date.now(),balances:{"alice.testnet":"250000","bob.testnet":"400000","guardian.testnet":"350000"} as Record<string,string>,keys:{} as Record<string,string>,calls:[] as Record<string,unknown>[]};
  function result(method:string,params:Record<string,unknown>){
    state.calls.push({method,...params});
    if(method==="status")return {chain_id:state.chain,sync_info:{syncing:false}};
    if(method==="block")return {header:{hash:blockHash,height:12345,timestamp_nanosec:String(BigInt(state.timestamp)*1000000n)}};
    if(params.request_type==="view_account")return {code_hash:state.codeHash,block_hash:blockHash,block_height:12345};
    if(params.request_type==="view_access_key"){
      if(state.keys[String(params.account_id)]!==params.public_key)throw new Error("Unknown account key");
      return {permission:state.permission};
    }
    const args=JSON.parse(Buffer.from(String(params.args_base64),"base64").toString());
    const value=params.method_name==="ft_metadata"?{spec:"ft-1.0.0",symbol:"GREED",decimals:state.decimals}:params.method_name==="ft_total_supply"?state.supply:state.balances[args.account_id]||"0";
    return {block_hash:state.queryHash,result:[...Buffer.from(JSON.stringify(value))]};
  }
  const request:typeof fetch=async(_url,init)=>{
    const body=JSON.parse(String(init?.body));
    try{return Response.json({jsonrpc:"2.0",id:body.id,result:result(body.method,body.params)});}
    catch{return Response.json({jsonrpc:"2.0",id:body.id,error:{message:"Unknown key"}});}
  };
  return {state,request,rpc:new GovernanceRpc("http://fixture.invalid",request)};
}
