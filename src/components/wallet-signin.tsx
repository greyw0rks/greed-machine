"use client";
import { useEffect,useState } from "react";
import { Wallet } from "lucide-react";
import type { NearConnector,EventMap,SignedMessage } from "@hot-labs/near-connect";
import { useMachine } from "./app-shell";

let connector:Promise<NearConnector>|undefined;
function walletConnector(){return connector||=import("@hot-labs/near-connect").then(({NearConnector})=>new NearConnector({network:"testnet",features:{testnet:true,signInAndSignMessage:true},autoConnect:false}));}
export function WalletSignin({onVerified}:{onVerified:()=>void}){
  const {data,refresh,act}=useMachine();const [busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    if(data.holder?.auth!=="wallet"||!connector)return;
    let disposed=false;let instance:NearConnector|undefined;
    const signedOut=()=>{if(!disposed)void act({action:"session",holderId:null}).catch(()=>{});};
    void connector.then(value=>{instance=value;if(!disposed)value.on("wallet:signOut",signedOut);});
    return()=>{disposed=true;instance?.off("wallet:signOut",signedOut);};
  },[data.holder?.auth,act]);
  async function signIn(){
    setBusy(true);setError("");
    try{
      const wallet=await walletConnector();await wallet.whenManifestLoaded;
      const response=await fetch("/api/wallet",{signal:AbortSignal.timeout(60_000),method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"challenge"})});
      const challenge=await response.json();if(!response.ok)throw new Error(challenge.error);
      let signed:SignedMessage|undefined;
      const received=(event:EventMap["wallet:signInAndSignMessage"])=>{signed=event.accounts[0]?.signedMessage;};
      wallet.on("wallet:signInAndSignMessage",received);
      try{await wallet.connect({signMessageParams:{message:challenge.message,recipient:challenge.recipient,nonce:Uint8Array.from(atob(challenge.nonce),c=>c.charCodeAt(0))}});}finally{wallet.off("wallet:signInAndSignMessage",received);}
      if(!signed)throw new Error("Wallet did not return a signed message.");
      const verified=await fetch("/api/wallet",{signal:AbortSignal.timeout(60_000),method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"verify",challengeId:challenge.id,signed})});
      const result=await verified.json();if(!verified.ok)throw new Error(result.error);
      await refresh();onVerified();
    }catch(error){setError(error instanceof Error?error.message:"Wallet verification failed. Try again.");}
    finally{setBusy(false);}
  }
  return <div className="wallet-signin"><h3>Verify a NEAR wallet</h3><p>Sign a message to prove wallet ownership. Voting uses a finalized testnet $GREED balance; treasury funds remain synthetic.</p><button className="button" disabled={busy||!data.walletConfigured} onClick={signIn}><Wallet size={16}/>{busy?"Waiting for wallet…":data.walletConfigured?"Verify testnet wallet":"Wallet governance is not configured"}</button>{error?<p className="negative" role="alert">{error}</p>:null}</div>;
}
