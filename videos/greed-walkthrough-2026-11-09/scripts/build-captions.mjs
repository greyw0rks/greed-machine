import {readFile,writeFile,mkdir} from 'node:fs/promises';
const request=JSON.parse(await readFile('narration.json','utf8'));
const voice=JSON.parse(await readFile(request.metadata,'utf8'));
// Keep display copy exact and derive sentence timing from ElevenLabs' native
// character alignment. Do not distribute words evenly across a take.
const texts={
 welcome:["Let's look inside Greed Machine.","We will start with the app's simulation."],
 cycle:["Start a cycle.","Scouts propose strategies, and the swarm debates the evidence."],
 security:["Security checks each proposal.","Here, stale data blocks funding."],
 payouts:["Follow the holder payments.","This failed payment stays protected, then succeeds on retry."],
 proof:["Now open the separate NEAR testnet proof.","These links show real demo token transfers."],
 results:["Holders received eight point four five demo dollars.","The treasury retained four point five five."],
 verify:["Verify the finalized balances.","This reads existing evidence;","it does not send new payments."],
 limits:["Demo dollars are unbacked.","Returns are fixtures.","Production economics remain open."]
};
const groups=[];
for(const line of request.lines){
 if(line.text!==voice[line.id].text||texts[line.id].join(' ')!==line.text)throw Error('Stale captions: '+line.id);
 const alignment=voice[line.id].alignment;
 if(!alignment?.characters?.length)throw Error('Missing native alignment: '+line.id);
 const spoken=alignment.characters.join('');
 let cursor=0;
 for(let i=0;i<texts[line.id].length;i++){
  const text=texts[line.id][i];
  const at=spoken.indexOf(text,cursor);
  if(at<0)throw Error('Native alignment differs from script: '+line.id);
  const last=at+text.length-1;
  const start=line.start+alignment.character_start_times_seconds[at];
  const end=Math.min(line.end,line.start+alignment.character_end_times_seconds[last]+0.35);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Invalid sentence timing: '+line.id);
  groups.push({line:line.id,text,start,end});
  cursor=last+1;
 }
}
for(let i=0;i<groups.length-1;i++)groups[i].end=Math.min(groups[i].end,groups[i+1].start);
const esc=x=>x.replaceAll('&','&amp;').replaceAll('<','&lt;');
const paragraphs=groups.map((g,i)=>`<p id="caption-${i}" class="caption-group" data-layout-allow-caption-zone>${esc(g.text)}</p>`).join('\n');
const tween=groups.map((g,i)=>`tl.set('#caption-${i}',{visibility:'visible',opacity:1},${g.start});tl.set('#caption-${i}',{visibility:'hidden',opacity:0},${g.end});`).join('\n');
await mkdir('compositions',{recursive:true});
await writeFile('compositions/captions.html',`<template><style>
@font-face{font-family:Geist;src:url('assets/fonts/GeistVF.woff');font-weight:100 900}
#root{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.caption-group{position:absolute;left:110px;right:110px;top:938px;height:76px;display:flex;align-items:center;justify-content:center;font:500 42px/1.25 Geist,sans-serif;color:#262820;background:#f3efe5;text-align:center;visibility:hidden;opacity:0;margin:0}
</style><div id="root" data-composition-id="captions" data-duration="80" data-width="1920" data-height="1080">${paragraphs}</div><script>const tl=gsap.timeline({paused:true});${tween}window.__timelines.captions=tl;</script></template>`);
const stamp=t=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
await writeFile('assets/captions.json',JSON.stringify({source:'ElevenLabs native character alignment; sentence captions matching all eight scripts',groups},null,2)+'\n');
await writeFile('greed-machine-elevenlabs.srt',groups.map((g,i)=>`${i+1}\n${stamp(g.start)} --> ${stamp(g.end)}\n${g.text}\n`).join('\n'));
console.log('Built '+groups.length+' sentence caption groups matching all eight takes.');
