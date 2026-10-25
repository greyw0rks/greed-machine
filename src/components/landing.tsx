"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, Pause, Play, ShieldCheck, Sparkles, Vote, Workflow } from "lucide-react";
import { Mark } from "./brand";
const MachineWorld=dynamic(()=>import("./machine-world"),{ssr:false});
const reducedMotionQuery="(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange:()=>void){const query=window.matchMedia(reducedMotionQuery);query.addEventListener("change",onChange);return()=>query.removeEventListener("change",onChange);}
function reducedMotionSnapshot(){return window.matchMedia(reducedMotionQuery).matches;}
function useHydrationSafeReducedMotion(){return useSyncExternalStore(subscribeReducedMotion,reducedMotionSnapshot,()=>true);}
const phases=[
  {title:"Holders give the orders.",short:"The mandate",body:"$GREED holders vote on a bounded treasury mandate. The community chooses the direction; immutable safety limits define the guardrails.",role:"Mandate approved",detail:"Token weight · balance snapshot · timelock",icon:Vote},
  {title:"Good bots. Different ideas.",short:"The swarm",body:"A yield scout and a momentum scout propose competing strategies. Their assumptions, confidence, and operating costs stay visible. The guardian tries to prove them wrong.",role:"Scouts at work",detail:"Independent proposals · adversarial review",icon:Sparkles},
  {title:"Even greed has limits.",short:"The guardian",body:"A separate policy engine checks every action. An unauthorized contract, excessive allocation, stale feed, or replay attempt stops here. No agent gets an override.",role:"Eight checks. Zero overrides.",detail:"Allowlist · reserve floor · expiry · replay protection",icon:ShieldCheck},
  {title:"Every outcome has a receipt.",short:"The ledger",body:"The ledger separates principal, proceeds, transaction costs, and agent costs. Compare the swarm against a single scout and doing nothing, including the scenarios where it loses.",role:"Receipt reconciled",detail:"Net outcome · cost per decision · benchmark",icon:Workflow}
];
export default function Landing(){
  const ref=useRef<HTMLDivElement>(null);
  const reduce=useHydrationSafeReducedMotion();
  const [paused,setPaused]=useState(false),[stage,setStage]=useState(0);
  const {scrollYProgress}=useScroll({target:ref,offset:["start start","end end"]});
  const progress=useSpring(scrollYProgress,{stiffness:100,damping:30});
  const worldOpacity=useTransform(progress,[0,.18,.38,.7,1],[1,.75,.32,.22,.45]);
  const phase=phases[stage];
  return <div ref={ref} className="landing">
    <motion.div className="world-layer" style={{opacity:reduce ? 1 : worldOpacity}}><MachineWorld progress={progress} paused={paused||Boolean(reduce)} stage={stage} onStage={()=>setStage(s=>(s+1)%4)}/></motion.div>
    <header className="landing-header"><Mark/><nav aria-label="Main navigation"><a href="#mechanism">The machine</a><a href="#evidence">The proof</a><a href="#governance">$GREED</a></nav><Link className="button button-small" href="/app">Enter the machine <ArrowUpRight size={15}/></Link></header>
    <main id="main">
      <section className="hero">
        <div className="hero-copy"><motion.h1 initial={false} animate={{opacity:1}} transition={{duration:.6}}>Greed never<br/><span>sleeps.</span></motion.h1><p>A little greed. A lot of intelligence.<br/>An autonomous treasury with a swarm of busy bots, a holder mandate, and hard limits.</p><div className="hero-actions"><Link href="/app" className="button button-large">Wake the machine <ArrowUpRight size={20}/></Link><a href="#mechanism" className="text-link">Meet the swarm <ArrowDown size={16}/></a></div><div className="hero-note"><span className="status-dot"/>NEAR concept · Working simulation demo</div></div>
        <div className="hero-scene-label"><span className="scene-bracket">[</span><div><b>Small bots. Serious business.</b><span>Scouting. Challenging. Carrying $GREED.</span></div><span className="scene-bracket">]</span></div>
        <div className="hero-bottom"><span>Governed by holders. Constrained by code.</span><a href="#mechanism" aria-label="Scroll to how the machine works"><ArrowDown size={20}/></a><span className="mono">THE MACHINE IS AWAKE</span></div>
      </section>
      <section className="manifesto"><p>Let the bots do the busywork.<br/><span>You keep the controls.</span></p><div className="manifesto-side"><span className="mini-token">G</span><p>Agents propose. Holders govern.<br/>Code decides what can happen.</p></div></section>
      <section id="mechanism" className="mechanism section-pad">
        <div className="section-heading"><h2>Inside the<br/>greed machine.</h2><p>One complete loop.<br/>Every decision out in the open.</p></div>
        <div className="mechanism-layout"><div className="phase-nav" role="tablist" aria-label="Treasury process">{phases.map((p,i)=><button key={p.short} type="button" role="tab" aria-selected={stage===i} aria-controls={`phase-${i}`} id={`tab-${i}`} tabIndex={stage===i?0:-1} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();setStage((i+1)%4);document.getElementById(`tab-${(i+1)%4}`)?.focus();}if(e.key==="ArrowLeft"||e.key==="ArrowUp"){e.preventDefault();setStage((i+3)%4);document.getElementById(`tab-${(i+3)%4}`)?.focus();}}} onClick={()=>setStage(i)} className={stage===i?"selected":""}><span className="phase-symbol"><p.icon size={20}/></span><span>{p.short}</span><ChevronRight size={18}/></button>)}</div><div className="phase-content" role="tabpanel" id={`phase-${stage}`} aria-labelledby={`tab-${stage}`} key={stage}><motion.div initial={reduce?false:{opacity:.6,transform:"translateY(12px)"}} animate={{opacity:1,transform:"translateY(0px)"}} transition={{duration:.6,ease:[.23,1,.32,1]}}><span className="phase-status"><Check size={15}/>{phase.role}</span><h3>{phase.title}</h3><p>{phase.body}</p><div className="phase-detail mono">{phase.detail}</div></motion.div></div></div>
      </section>
      <section id="evidence" className="evidence section-pad"><div className="evidence-intro"><h2>Show the work.<br/><span>Then show the costs.</span></h2><p>A treasury should earn your trust. Run the fixed scenarios, inspect a rejected action, and see exactly how the result was calculated.</p><Link href="/app/swarm" className="text-link">Run your first scenario <ArrowUpRight size={17}/></Link></div><div className="receipt-preview"><div className="receipt-top"><span className="mono">SYNTHETIC EVALUATION RECEIPT</span><ShieldCheck size={20}/></div><h3>Steady yield</h3><p>30-day scenario · liquid lending</p><dl><div><dt>Capital deployed</dt><dd>$20,000.00</dd></div><div><dt>Scenario proceeds</dt><dd>$20,144.00</dd></div><div><dt>Transaction & slippage</dt><dd>−$5.85</dd></div><div><dt>Simulated agent cost</dt><dd>−$0.16</dd></div><div className="receipt-total"><dt>Illustrative net outcome</dt><dd>+$137.99</dd></div></dl><div className="receipt-bottom"><span className="status-dot"/>Arithmetic you can reproduce. Not a live return.</div></div></section>
      <section className="guardrail-band"><ShieldCheck size={32}/><p>Ambitious agents.<br/>Unambiguous limits.</p><div><span>8</span><p>deterministic checks<br/>before every action</p></div><Link href="/app/risk" className="text-link">Try to break it <ArrowUpRight size={18}/></Link></section>
      <section id="governance" className="governance-landing section-pad"><div><h2>The token gives<br/><span>you a say.</span></h2><p>$GREED supplies the voting weight. Holders set the mandate. Discord supplies the discussion. Community roles never add financial power.</p><Link href="/app/governance" className="button button-outline">Explore governance <ArrowUpRight size={18}/></Link></div><div className="mandate-preview"><div className="mandate-preview-head"><Vote size={24}/><span className="pill">Holder mandate</span></div><h3>Capital preservation</h3><div className="mandate-line"><span>Spend ceiling</span><b>25,000 USDC</b></div><div className="mandate-line"><span>Protocol exposure</span><b>≤ 35%</b></div><div className="mandate-line"><span>Reserve floor</span><b>≥ 25%</b></div><p>These are the demo’s starting limits. Successful votes can only change policy inside the hard safety boundaries.</p></div></section>
      <section className="closing"><span className="closing-token">G</span><h2>Put your greed<br/>to work.</h2><Link href="/app" className="button button-large">Enter the machine <ArrowUpRight size={22}/></Link><p>Meet the bots. Set the mandate. Inspect the evidence.</p></section>
    </main>
    <footer className="landing-footer"><Mark small/><span>Built for the NEAR agent economy.</span><span>Simulation first. Every cost visible.</span><a href="/app/audit">Inspect the ledger <ArrowRight size={14}/></a></footer>
    <button className="motion-control" onClick={()=>setPaused(p=>!p)} aria-pressed={paused} aria-label={paused?"Resume bot motion":"Pause bot motion"}>{paused||reduce?<Play size={14}/>:<Pause size={14}/>}<span>{reduce?"Reduced motion":paused?"Bots on break":"Pause the bots"}</span></button>
  </div>;
}
