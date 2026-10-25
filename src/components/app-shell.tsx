"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Bot, Check, ChevronDown, FileText, FlaskConical, LayoutDashboard, Menu, ShieldCheck, Vote, X } from "lucide-react";
import { Mark } from "./brand";
import { WalletSignin } from "./wallet-signin";
import type { DashboardData } from "@/lib/types";
const navigation=[{href:"/app",label:"Overview",icon:LayoutDashboard},{href:"/app/swarm",label:"Swarm Lab",icon:Bot},{href:"/app/risk",label:"Risk Lab",icon:ShieldCheck},{href:"/app/governance",label:"Governance",icon:Vote},{href:"/app/audit",label:"Audit Log",icon:FileText}];
interface MachineContext { data: DashboardData; act: (action: Record<string,unknown>) => Promise<unknown>; busy: string | null; connect: () => void; refresh: () => Promise<void> }
const Context=createContext<MachineContext|null>(null);
export function useMachine(){const value=useContext(Context);if(!value)throw new Error("Machine context is missing");return value;}
export function AppShell({initial,children}:{initial:DashboardData;children:React.ReactNode}){
  const path=usePathname();
  const [data,setData]=useState(initial),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState(""),[dialog,setDialog]=useState(false),[menu,setMenu]=useState(false);
  const refresh=useCallback(async()=>{const r=await fetch("/api/machine",{cache:"no-store"});if(!r.ok)throw new Error("Could not reload treasury data.");setData(await r.json());},[]);
  const act=useCallback(async(action:Record<string,unknown>)=>{
    setBusy(String(action.action));setError("");
    try{const res=await fetch("/api/machine",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action)});const body=await res.json();if(!res.ok)throw new Error(body.error||"Action could not complete.");setData(body.state);return body.result;}
    catch(e){setError(e instanceof Error?e.message:"Action could not complete.");throw e;}
    finally{setBusy(null);}
  },[]);
  const connect=useCallback(()=>setDialog(true),[]);
  const active=navigation.find(n=>n.href===path);
  const holderLabel=data.holder?`${data.holder.name} · ${data.holder.auth==="wallet"?"verified wallet":"demo holder"}`:data.walletConfigured||!data.demoSessionsEnabled?"Connect wallet":"Choose demo holder";
  return <Context.Provider value={{data,act,busy,connect,refresh}}><div className="app-shell">
    <aside className={`sidebar ${menu?"sidebar-open":""}`}><div className="sidebar-brand"><Mark small/><button className="icon-button mobile-only" aria-label="Close navigation" onClick={()=>setMenu(false)}><X size={20}/></button></div><div className="sidebar-label">Treasury workspace</div><nav aria-label="Workspace navigation">{navigation.map(n=><Link key={n.href} href={n.href} aria-current={path===n.href?"page":undefined} className={path===n.href?"active":""} onClick={()=>setMenu(false)}><n.icon size={18}/>{n.label}{path===n.href?<span className="nav-dot"/>:null}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-machine"><Bot size={28}/><div><b>The machine room</b><span>{data.mandate.paused?"Treasury paused":"Ready for a decision"}</span></div></div><Link href="/" className="sidebar-back">Back to the landing page <ArrowUpRight size={14}/></Link><div className="environment-note"><FlaskConical size={14}/>SIMULATION ENVIRONMENT</div></div></aside>
    {menu?<button className="sidebar-scrim" aria-label="Close navigation" onClick={()=>setMenu(false)}/>:null}
    <div className="app-content"><header className="app-topbar"><div className="topbar-left"><button className="icon-button mobile-only" onClick={()=>setMenu(true)} aria-label="Open navigation"><Menu size={20}/></button><span>Workspace</span><span className="slash">/</span><b>{active?.label||"Overview"}</b></div><div className="topbar-right"><span className="pill environment-pill"><span className="status-dot"/>Simulation</span><button className="holder-button" aria-label={holderLabel} onClick={()=>setDialog(true)}><span className="avatar">{data.holder?data.holder.name[0]:"G"}</span><span>{holderLabel}</span><ChevronDown size={14}/></button></div></header><main id="main" className="workspace-main">{children}</main><footer className="workspace-footer"><span>Synthetic USDC · Snapshot-weighted governance · No real treasury funds</span><span><ShieldCheck size={13}/>{data.auditValid?"Audit chain verified":"Audit chain requires attention"}</span></footer></div>
    {error?<div className="action-error" role="alert"><span>{error}</span><button className="icon-button" onClick={()=>setError("")} aria-label="Dismiss error"><X size={16}/></button></div>:null}
    <Dialog.Root open={dialog} onOpenChange={setDialog} modal={false}><Dialog.Portal><div className="dialog-overlay" aria-hidden="true"/><Dialog.Content className="dialog-content" onInteractOutside={event=>{if(event.target instanceof Element&&event.target.closest(".hot-connector-popup"))event.preventDefault();}}><Dialog.Title>{data.walletConfigured||!data.demoSessionsEnabled?"Connect to Greed Machine":"Choose a demo holder"}</Dialog.Title><Dialog.Description>Verify a NEAR testnet wallet for token-weighted governance{data.demoSessionsEnabled?", or explore with a synthetic demo identity":""}. Treasury funds remain synthetic.</Dialog.Description><WalletSignin onVerified={()=>setDialog(false)}/>{data.demoSessionsEnabled?<h3 className="demo-signin-heading">Explore with a demo holder</h3>:null}<div className="holder-options">{data.holders.map(h=><button key={h.id} disabled={Boolean(busy)} onClick={async()=>{try{await act({action:"session",holderId:h.id});setDialog(false);}catch{}}}><span className="avatar">{h.name[0]}</span><div><b>{h.name}</b><span>{h.role} · {h.balance.toLocaleString()} $GREED</span></div><b>{h.balance/10000}%</b>{data.holder?.id===h.id?<Check size={17}/>:<ArrowUpRight size={17}/>}</button>)}</div><p className="dialog-note">Roles add no voting power. The Guardian can pause the simulated treasury.</p>{data.holder?<button className="button button-outline" disabled={Boolean(busy)} onClick={async()=>{try{await act({action:"session",holderId:null});setDialog(false);}catch{}}}>{data.holder.auth==="wallet"?"Sign out":"End demo session"}</button>:null}<Dialog.Close className="dialog-close icon-button" aria-label="Close holder selection"><X size={20}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div></Context.Provider>;
}
