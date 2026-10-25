"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

function useCoinTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#c7ff3d"; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#6c8b20"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(256,256,216,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#10150a"; ctx.font = "900 280px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("G",256,252);
    ctx.font = "bold 25px Arial"; ctx.fillText("G R E E D",256,414);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
function Coin({ scale = 1, onClick }: { scale?: number; onClick?: () => void }) {
  const texture = useCoinTexture();
  return <group scale={scale} onClick={onClick}>
    <mesh rotation={[Math.PI/2, 0, 0]} castShadow><cylinderGeometry args={[1, 1, .18, 80]}/><meshStandardMaterial color="#b4ca83" metalness={.86} roughness={.22}/></mesh>
    <mesh position={[0,0,.101]}><circleGeometry args={[.91, 80]}/><meshStandardMaterial map={texture} metalness={.38} roughness={.32}/></mesh>
    <mesh position={[0,0,-.101]} rotation={[0,Math.PI,0]}><circleGeometry args={[.91,80]}/><meshStandardMaterial map={texture} metalness={.38} roughness={.32}/></mesh>
    <mesh position={[0,0,.11]}><torusGeometry args={[.95,.027,12,80]}/><meshStandardMaterial color="#e4ff95" metalness={.7} roughness={.15}/></mesh>
    {Array.from({length:32},(_,i) => <mesh key={i} position={[Math.sin(i*Math.PI/16)*.985,Math.cos(i*Math.PI/16)*.985,0]} rotation={[0,0,-i*Math.PI/16]}><boxGeometry args={[.017,.03,.19]}/><meshStandardMaterial color="#718244" metalness={.9} roughness={.3}/></mesh>)}
  </group>;
}
function Bot({ color, phase, route, paused, small }: { color: string; phase: number; route: number; paused: boolean; small: boolean }) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null), rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null), rightLeg = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const clock = useRef(phase);
  useFrame((_, delta) => {
    if (!root.current) return;
    if (!paused) clock.current += Math.min(delta,.04) * .56;
    const t = clock.current;
    const x = Math.sin(t + route) * (small ? 1.55 : viewport.width * .32);
    const y = -1.45 + Math.sin(t * 2 + phase) * (paused ? 0 : .055) + route * .23;
    root.current.position.set(x,y, .45 + Math.cos(t+route) * .55);
    root.current.rotation.y = Math.cos(t+route) > 0 ? .36 : -.36;
    const walk = paused ? 0 : Math.sin(t*12) * .4;
    if(leftArm.current) leftArm.current.rotation.x=walk;
    if(rightArm.current) rightArm.current.rotation.x=-walk;
    if(leftLeg.current) leftLeg.current.rotation.x=-walk;
    if(rightLeg.current) rightLeg.current.rotation.x=walk;
  });
  return <group ref={root} scale={small ? .6 : .68}>
    <RoundedBox args={[.75,.66,.52]} radius={.15} position={[0,.75,0]} castShadow><meshStandardMaterial color="#d5d7ce" metalness={.6} roughness={.32}/></RoundedBox>
    <RoundedBox args={[.6,.36,.08]} radius={.11} position={[0,.77,.27]}><meshStandardMaterial color="#111912" metalness={.45} roughness={.28}/></RoundedBox>
    {[-.15,.15].map(x=><mesh key={x} position={[x,.81,.32]}><capsuleGeometry args={[.028,.063,4,8]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.7}/></mesh>)}
    <mesh position={[0,.66,.321]} rotation={[0,0,Math.PI/2]}><capsuleGeometry args={[.011,.06,4,8]}/><meshBasicMaterial color={color}/></mesh>
    <mesh position={[0,1.15,0]}><cylinderGeometry args={[.014,.014,.17,8]}/><meshStandardMaterial color="#88918c" metalness={.8}/></mesh>
    <mesh position={[0,1.25,0]}><sphereGeometry args={[.06,12,12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.7}/></mesh>
    <RoundedBox args={[.5,.48,.4]} radius={.09} position={[0,.2,0]} castShadow><meshStandardMaterial color="#727b70" metalness={.7} roughness={.32}/></RoundedBox>
    <RoundedBox args={[.32,.09,.025]} radius={.02} position={[0,.3,.21]}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.5}/></RoundedBox>
    <group ref={leftArm} position={[-.35,.37,0]}><mesh position={[0,-.18,0]}><capsuleGeometry args={[.065,.25,6,12]}/><meshStandardMaterial color="#b3b9aa" metalness={.5} roughness={.4}/></mesh><mesh position={[0,-.37,.04]}><sphereGeometry args={[.09,12,12]}/><meshStandardMaterial color={color}/></mesh></group>
    <group ref={rightArm} position={[.35,.37,0]}><mesh position={[0,-.18,.05]} rotation={[.5,0,0]}><capsuleGeometry args={[.065,.25,6,12]}/><meshStandardMaterial color="#b3b9aa" metalness={.5} roughness={.4}/></mesh><group position={[.08,-.18,.28]} rotation={[0,.3,-.12]}><Coin scale={.22}/></group></group>
    <group ref={leftLeg} position={[-.15,0,0]}><mesh position={[0,-.16,0]}><capsuleGeometry args={[.065,.15,6,10]}/><meshStandardMaterial color="#c4c9b9" metalness={.5}/></mesh><RoundedBox args={[.19,.12,.27]} radius={.04} position={[0,-.3,.05]}><meshStandardMaterial color="#606959" metalness={.5}/></RoundedBox></group>
    <group ref={rightLeg} position={[.15,0,0]}><mesh position={[0,-.16,0]}><capsuleGeometry args={[.065,.15,6,10]}/><meshStandardMaterial color="#c4c9b9" metalness={.5}/></mesh><RoundedBox args={[.19,.12,.27]} radius={.04} position={[0,-.3,.05]}><meshStandardMaterial color="#606959" metalness={.5}/></RoundedBox></group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.37,0]}><circleGeometry args={[.38,32]}/><meshBasicMaterial color="#000000" transparent opacity={.28} depthWrite={false}/></mesh>
  </group>;
}
function Scene({ progress, paused, stage, onStage }: { progress: MotionValue<number>; paused: boolean; stage: number; onStage: () => void }) {
  const core = useRef<THREE.Group>(null), ring = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const time = useRef(0);
  const small = viewport.width < 6;
  useFrame((state, delta) => {
    if(!core.current || !ring.current) return;
    if(!paused) time.current += Math.min(delta,.04);
    const p = progress.get();
    const hero = Math.max(0,1-p*5);
    core.current.position.set(small ? 0 : 2.25 * hero, small ? -.65 : .05, -p*2);
    core.current.rotation.y = paused ? -.35 : -.35 + Math.sin(time.current*.34)*.16 + p * Math.PI * 1.8;
    core.current.rotation.z = -.12 + stage*.025;
    core.current.scale.setScalar(small ? .85 : 1.2 - p*.25);
    ring.current.rotation.z=paused ? 0 : time.current*.14;
    if(!paused && !small) {
      state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x,state.pointer.x*.18,4,delta);
      state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y,state.pointer.y*.1,4,delta);
      state.camera.lookAt(0,0,0);
    }
  });
  return <>
    <ambientLight intensity={1.6}/><directionalLight position={[3,5,5]} intensity={4} color="#ecffd4"/><directionalLight position={[-5,1,3]} intensity={3} color="#a78bfa"/><pointLight position={[3,1,-2]} intensity={30} color="#c7ff3d"/>
    <group ref={core}>
      <Coin onClick={onStage}/>
      <group ref={ring} rotation={[.25,.3,0]}>
        <mesh><torusGeometry args={[1.34,.015,12,120]}/><meshStandardMaterial color="#8c9b77" metalness={.85} roughness={.2}/></mesh>
        <mesh rotation={[.5,-.45,.4]}><torusGeometry args={[1.55,.01,12,120]}/><meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={.35} metalness={.6}/></mesh>
        {[0,1,2,3].map(i=><group key={i} position={[Math.sin(i*Math.PI/2)*1.34,Math.cos(i*Math.PI/2)*1.34,0]}><mesh><sphereGeometry args={[.045,16,16]}/><meshStandardMaterial color={i===stage ? "#c7ff3d" : "#a78bfa"} emissive={i===stage ? "#c7ff3d" : "#a78bfa"} emissiveIntensity={1.5}/></mesh></group>)}
      </group>
    </group>
    <Bot color="#c7ff3d" phase={.1} route={0} paused={paused} small={small}/>
    <Bot color="#a78bfa" phase={2.3} route={1} paused={paused} small={small}/>
    <Bot color="#ff9d7f" phase={4.2} route={-.65} paused={paused} small={small}/>
    {!small ? <Bot color="#b5e9ff" phase={3.4} route={.6} paused={paused} small={false}/> : null}
  </>;
}
class SceneBoundary extends Component<{children: React.ReactNode; onError: () => void}, { failed: boolean }> {
  state={failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch(){this.props.onError();}
  render(){return this.state.failed ? null : this.props.children;}
}
export default function MachineWorld({ progress, paused, stage, onStage }: { progress: MotionValue<number>; paused: boolean; stage: number; onStage: () => void }) {
  const [available,setAvailable]=useState(true);
  const [visible,setVisible]=useState(true);
  useEffect(()=>{const listener=()=>setVisible(!document.hidden);document.addEventListener("visibilitychange",listener);return()=>document.removeEventListener("visibilitychange",listener);},[]);
  return <div className="machine-world" aria-hidden="true">
    <div className={`world-poster ${available ? "poster-behind" : ""}`}><div className="poster-coin">G<span>GREED</span></div><div className="poster-orbit"/></div>
    {available ? <SceneBoundary onError={()=>setAvailable(false)}><Canvas dpr={[1,1.5]} camera={{position:[0,0,8],fov:38}} gl={{alpha:true,antialias:true,powerPreference:"low-power"}} frameloop={visible ? "always" : "never"} onCreated={({gl})=>{gl.setClearColor("#0b0d0c",0);}}><Scene progress={progress} paused={paused} stage={stage} onStage={onStage}/></Canvas></SceneBoundary> : null}
  </div>;
}
