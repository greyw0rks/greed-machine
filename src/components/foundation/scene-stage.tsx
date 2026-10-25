"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Pause, Play, ArrowUpRight } from "lucide-react";
const Scene=dynamic(()=>import("./swarm-scene"),{ssr:false});
const phases=[{name:"Discover",detail:"Independent scouts find yield opportunities and build competing proposals."},{name:"Debate",detail:"An adversarial analyst challenges assumptions. Scouts respond before a winner is selected."},{name:"Defend",detail:"Independent security review and hard limits must both pass before capital can move."},{name:"Distribute",detail:"Realized net profit recovers prior losses, then splits between holders and the treasury."}];
export function FlowFallback(){return <svg className="flow-fallback" viewBox="0 0 700 380" role="img" aria-label="Three scouts converge at security, then profits branch to holders and treasury"><g fill="none" stroke="#b6c5ff" strokeWidth="2"><path d="M140 90C270 90 240 190 350 190M140 190H350M140 290C270 290 240 190 350 190M350 190C480 190 460 110 570 110M350 190C480 190 460 270 570 270"/></g><g fill="#eef1f7">{[90,190,290].map(y=><rect key={y} x="94" y={y-28} width="62" height="56" rx="17"/>)}<path d="m350 120 61 35v70l-61 35-61-35v-70Z"/></g><g fill="#2548f4">{[90,190,290].map(y=><g key={y}><circle cx="114" cy={y} r="5"/><circle cx="136" cy={y} r="5"/></g>)}<path d="m324 190 17 17 36-36" fill="none" stroke="#2548f4" strokeWidth="9"/></g><circle cx="575" cy="110" r="37" fill="#f28b62"/><circle cx="575" cy="270" r="30" fill="#eef1f7"/></svg>;}
class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function SceneStage(){
  const [phase,setPhase]=useState(0),[paused,setPaused]=useState(false),[visible,setVisible]=useState(true),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const reduced=useReducedMotion(),ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting&&!document.hidden),{threshold:.05});if(ref.current)observer.observe(ref.current);const change=()=>setVisible(!document.hidden&&!!ref.current&&ref.current.getBoundingClientRect().bottom>0);document.addEventListener("visibilitychange",change);return()=>{observer.disconnect();document.removeEventListener("visibilitychange",change);};},[]);
  const active=visible&&!paused&&!reduced;
  return <div className="scene-stage" ref={ref}>
    <div className="scene-topline"><span>Inside the machine</span><span>Concept visualization <ArrowUpRight size={13}/></span></div>
    <div className="scene-canvas" data-scene-ready={ready} data-motion={active?"playing":"paused"}>
      {(!ready||failed)&&<FlowFallback/>}
      {!failed&&<SceneBoundary fallback={<FlowFallback/>}><Scene active={active} phase={phase} onReady={()=>setReady(true)} onFailure={()=>setFailed(true)}/></SceneBoundary>}
      <div className="scene-labels" aria-hidden="true"><span>Scouts</span><span>Security</span><span>Profit split</span></div>
      <button className="scene-pause" onClick={()=>setPaused(!paused)} disabled={!!reduced||failed} aria-label={reduced?"Motion reduced":paused?"Play 3D animation":"Pause 3D animation"}>{paused||reduced?<Play size={15}/>:<Pause size={15}/>}<span>{reduced?"Reduced motion":paused?"Play":"Pause"}</span></button>
    </div>
    <div className="scene-phases" role="tablist" aria-label="How the machine works">{phases.map((p,i)=><button role="tab" id={`phase-${i}`} aria-controls="phase-detail" aria-selected={i===phase} tabIndex={i===phase?0:-1} onKeyDown={e=>{const next=e.key==="ArrowRight"?(phase+1)%4:e.key==="ArrowLeft"?(phase+3)%4:e.key==="Home"?0:e.key==="End"?3:null;if(next!==null){e.preventDefault();setPhase(next);document.getElementById(`phase-${next}`)?.focus();}}} key={p.name} onClick={()=>setPhase(i)}>{String(i+1).padStart(2,"0")}<span>{p.name}</span>{phase===i&&<motion.span layoutId="phase-line" className="phase-line" transition={{duration:reduced?0:.22,ease:[.23,1,.32,1]}}/>}</button>)}</div>
    <div className="scene-description" role="tabpanel" id="phase-detail" aria-labelledby={`phase-${phase}`}><AnimatePresence mode="wait" initial={false}><motion.p key={phase} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}}>{phases[phase].detail}</motion.p></AnimatePresence></div>
  </div>;
}
