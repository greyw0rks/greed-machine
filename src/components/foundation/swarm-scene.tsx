"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const BLUE="#2548f4", WHITE="#f2f4ff", PEACH="#f28b62";
const sources: [number,number,number][]=[[-3,0,-1.9],[-3,0,0],[-3,0,1.9]];
function Scout({position,index,active}:{position:[number,number,number];index:number;active:boolean}){
  const ref=useRef<THREE.Group>(null),time=useRef(index);
  useFrame((_,dt)=>{if(active&&ref.current){time.current+=dt;ref.current.position.y=position[1]+Math.sin(time.current*1.3)*.09;}});
  return <group ref={ref} position={position} rotation={[0,.45,0]}>
    <RoundedBox args={[.9,.72,.68]} radius={.17} smoothness={3} position={[0,.5,0]}><meshStandardMaterial color={WHITE} roughness={.28} metalness={.25}/></RoundedBox>
    <RoundedBox args={[.69,.32,.06]} radius={.1} smoothness={3} position={[0,.54,.35]}><meshStandardMaterial color="#101c45" roughness={.25}/></RoundedBox>
    {[-.18,.18].map(x=><mesh key={x} position={[x,.55,.393]}><boxGeometry args={[.075,.12,.025]}/><meshBasicMaterial color={index===1?PEACH:"#9fb5ff"}/></mesh>)}
    <mesh position={[0,.95,0]}><sphereGeometry args={[.08,12,12]}/><meshStandardMaterial color={PEACH}/></mesh>
    <RoundedBox args={[.63,.26,.53]} radius={.1} smoothness={3} position={[0,-.05,0]}><meshStandardMaterial color={WHITE} metalness={.3} roughness={.35}/></RoundedBox>
    {[-.49,.49].map(x=><mesh key={x} position={[x,.06,0]} rotation={[0,0,x]}><capsuleGeometry args={[.09,.23,3,8]}/><meshStandardMaterial color={WHITE}/></mesh>)}
    <mesh position={[0,-.42,0]}><cylinderGeometry args={[.65,.7,.12,32]}/><meshStandardMaterial color="#7290ff" roughness={.45} metalness={.2}/></mesh>
  </group>;
}
function Traffic({points,active,delay,color=WHITE}:{points:[number,number,number][];active:boolean;delay:number;color?:string}){
  const path=useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),[points]);
  const geometry=useMemo(()=>new THREE.TubeGeometry(path,40,.012,6,false),[path]);
  const ref=useRef<THREE.Mesh>(null),clock=useRef(delay);
  useFrame((_,dt)=>{if(active)clock.current+=dt*.13;if(ref.current){ref.current.position.copy(path.getPoint(clock.current%1));if(active)ref.current.rotation.y+=dt;}});
  return <group><mesh geometry={geometry}><meshBasicMaterial color="#93aaff" transparent opacity={.6}/></mesh><mesh ref={ref} position={points[0]}><octahedronGeometry args={[.115]}/><meshStandardMaterial color={color} metalness={.35} roughness={.2}/></mesh></group>;
}
const routes: [number,number,number][][]=[...sources.map(([x,y,z])=>[[x+.55,y,z],[-1.5,.1,z],[0,.1,0]] as [number,number,number][]),[[.3,.1,0],[1.7,.1,-.4],[3.3,.1,-1.3]],[[.3,.1,0],[1.6,.1,.5],[3.3,.1,1.4]]];
function World({active,phase}:{active:boolean;phase:number}){
  const gate=useRef<THREE.Group>(null),ring=useRef<THREE.Mesh>(null),clock=useRef(0);
  const width=useThree(s=>s.size.width);
  const camera=useThree(s=>s.camera),invalidate=useThree(s=>s.invalidate);
  useEffect(()=>{if(camera instanceof THREE.OrthographicCamera){camera.zoom=width<500?42:60;camera.updateProjectionMatrix();invalidate();}},[camera,width,invalidate]);
  useFrame((_,dt)=>{if(!active)return;clock.current+=dt;if(gate.current)gate.current.rotation.y=Math.sin(clock.current*.2)*.12;if(ring.current)ring.current.rotation.z+=dt*.16;});
  return <group scale={width<500?.79:1} rotation={[0,-.14,0]}>
    <ambientLight intensity={1.8}/><directionalLight position={[-3,7,5]} intensity={3.5} color="#ffffff"/><directionalLight position={[4,1,-3]} intensity={3} color="#9bbaff"/>
    {sources.map((p,i)=><Scout key={i} position={p} index={i} active={active}/>)}
    {routes.map((p,i)=><Traffic key={i} points={p} active={active} delay={i*.21} color={i>2?PEACH:WHITE}/>)}
    <group ref={gate} position={[0,.42,0]}>
      <mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.94,.94,.36,8]}/><meshStandardMaterial color={WHITE} metalness={.55} roughness={.23}/></mesh>
      <mesh position={[0,0,.22]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.67,.67,.13,8]}/><meshStandardMaterial color={phase===2?PEACH:BLUE} metalness={.35} roughness={.3}/></mesh>
      <mesh ref={ring} rotation={[0,0,.2]}><torusGeometry args={[1.25,.027,8,72]}/><meshStandardMaterial color={WHITE} metalness={.4} roughness={.28}/></mesh>
      <mesh position={[0,0,.33]} rotation={[0,0,-Math.PI/4]}><boxGeometry args={[.42,.12,.08]}/><meshStandardMaterial color={WHITE}/></mesh>
      <mesh position={[-.2,-.08,.33]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[.24,.12,.08]}/><meshStandardMaterial color={WHITE}/></mesh>
    </group>
    <mesh position={[0,-.45,0]}><cylinderGeometry args={[1.12,1.2,.17,64]}/><meshStandardMaterial color="#718aff" roughness={.4} metalness={.5}/></mesh>
    {[[-1.3,PEACH],[1.4,WHITE]].map(([z,color],i)=><group key={i} position={[3.25,0,z as number]}>
      {Array.from({length:i===0?5:3},(_,n)=><mesh key={n} position={[0,n*.15-.23,0]}><cylinderGeometry args={[.55,.55,.11,48]}/><meshStandardMaterial color={color as string} metalness={.4} roughness={.3}/></mesh>)}
      <mesh position={[0,-.46,0]}><cylinderGeometry args={[.74,.78,.12,40]}/><meshStandardMaterial color="#718aff" roughness={.4}/></mesh>
    </group>)}
  </group>;
}
export default function SwarmScene({active,phase,onReady,onFailure}:{active:boolean;phase:number;onReady:()=>void;onFailure:()=>void}){
  return <Canvas orthographic camera={{position:[6,5,9],zoom:64,near:.1,far:50}} dpr={[1,1.5]} frameloop={active?"always":"demand"} gl={{antialias:true,alpha:true,powerPreference:"low-power"}} onCreated={({gl})=>{gl.domElement.addEventListener("webglcontextlost",onFailure,{once:true});onReady();}}><World active={active} phase={phase}/></Canvas>;
}
