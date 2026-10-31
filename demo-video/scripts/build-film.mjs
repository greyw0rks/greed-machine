import { readFile, writeFile, mkdir } from 'node:fs/promises';
const scenes=[
{id:'opening',start:0,duration:9,dark:true,title:'A memecoin with mechanics.'},
{id:'funding',start:9,duration:9,title:'Fuel for the treasury.'},
{id:'swarm',start:18,duration:9,title:'Many minds. One candidate.'},
{id:'security',start:27,duration:9,dark:true,title:'A proposal earns permission.'},
{id:'operations',start:36,duration:9,title:'Capital works within rules.'},
{id:'distribution',start:45,duration:9,title:'Profit flows back to holders.'},
{id:'closing',start:54,duration:6,dark:true,title:'Buy. Hold. Inspect.'}
];
const request=JSON.parse(await readFile('narration.json','utf8'));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for(const [i,s] of scenes.entries())if(request.lines[i]?.id!==s.id||request.lines[i].start<s.start||request.lines[i].end>s.start+s.duration)throw Error(`Narration does not fit ${s.id}`);
const css=`
@font-face{font-family:Geist;src:url('assets/fonts/GeistVF.woff');font-weight:100 900}
#root{position:absolute;inset:0;width:100%;height:100%;font-family:Geist,sans-serif;background:#f3efe5;color:#262820}
#root[data-dark=true]{background:#3f5138;color:#f3efe5}
#root *{box-sizing:border-box;margin:0}
.gm-brand{position:absolute;left:110px;top:95px;font-size:28px;font-weight:550;letter-spacing:.1em}
.gm-chapter{position:absolute;right:110px;top:95px;font-size:28px}
.gm-title{position:absolute;left:110px;top:186px;right:110px;font-size:86px;font-weight:600;line-height:1.12;letter-spacing:-.045em}
.gm-footer{position:absolute;left:110px;right:110px;top:826px;font-size:30px;line-height:1.35;color:#66685b}
.gm-rail{position:absolute;inset:918px 0 0;background:#f3efe5}
.gm-step{font-size:30px;font-weight:550;letter-spacing:.08em;color:#66685b}
.gm-label{font-size:47px;font-weight:550;line-height:1.15;letter-spacing:-.03em}
.gm-copy{font-size:34px;line-height:1.4}
.gm-arrow{font-size:64px;line-height:1;color:#3f5138}
.gm-band{position:absolute;left:110px;right:110px;top:755px;height:110px;display:flex;align-items:center;padding:0 36px;background:#3f5138;color:#f3efe5;font-size:38px;font-weight:500}
#opening-title{top:240px;width:900px;right:auto;font-size:112px;line-height:1.04}
#opening-title span{display:block}
#opening-art{position:absolute;left:1000px;top:330px;width:810px;height:auto}
#opening-journey{position:absolute;left:110px;right:110px;top:790px;display:flex;align-items:center;gap:35px;font-size:34px;font-weight:500}
#opening-journey .gm-arrow{color:#cda45c;font-size:48px}
.funding-source{position:absolute;left:110px;width:900px;display:flex;align-items:center;justify-content:space-between;padding:25px 0;border-bottom:1px solid #c4c5b7}
#funding-launch{top:350px}#funding-fees{top:485px}#funding-retained{top:620px}
#funding-treasury{position:absolute;left:1210px;top:350px;width:600px;height:400px;padding:50px;background:#3f5138;color:#f3efe5}
#funding-treasury .gm-step{color:#e1e1d0}#funding-treasury .gm-label{margin-top:45px;font-size:56px}#funding-treasury .gm-copy{margin-top:30px}
.swarm-role{position:absolute;top:370px;width:520px;height:310px;padding-top:30px;border-top:2px solid #3f5138}
#swarm-scout{left:110px}#swarm-strategist{left:700px}#swarm-challenger{left:1290px}
.swarm-role .gm-label{margin-top:30px}.swarm-role .gm-copy{margin-top:28px;max-width:460px;color:#66685b}
.security-panel{position:absolute;top:365px;width:760px}
#security-review{left:110px}#security-controls{left:1050px}
.security-panel .gm-label{font-size:54px}.security-panel ul{list-style:none;margin-top:36px;display:grid;gap:24px;font-size:36px;line-height:1.2}
.security-panel li{padding-bottom:19px;border-bottom:1px solid #89917b}
#security-keys{background:#cda45c;color:#262820;top:775px;height:90px}
.operation{position:absolute;top:375px;width:365px;border-top:2px solid #3f5138;padding-top:30px}
#operations-allocate{left:110px}#operations-monitor{left:555px}#operations-exit{left:1000px}#operations-reconcile{left:1445px}
.operation .gm-label{margin-top:30px}.operation .gm-copy{margin-top:30px;color:#66685b}
#operations-profit{position:absolute;left:110px;right:110px;top:760px;font-size:38px;line-height:1.35;padding-top:28px;border-top:1px solid #c4c5b7}
#distribution-share{position:absolute;left:110px;top:360px;font-size:172px;font-weight:600;line-height:1;letter-spacing:-.06em;color:#3f5138}
#distribution-basis{position:absolute;left:120px;top:565px;font-size:42px;font-weight:500}
#distribution-target{position:absolute;left:120px;top:635px;max-width:670px;font-size:30px;line-height:1.4;color:#66685b}
#distribution-holders{position:absolute;left:950px;top:360px;width:860px;height:340px;padding:55px;background:#3f5138;color:#f3efe5}
#distribution-holders .gm-label{font-size:57px}#distribution-holders .gm-copy{margin-top:35px}
#distribution-retained{position:absolute;left:110px;right:110px;top:780px;font-size:38px;font-weight:500;padding-top:28px;border-top:1px solid #c4c5b7}
#closing-title{top:280px;font-size:126px}
#closing-promise{position:absolute;left:110px;right:110px;top:515px;font-size:56px;line-height:1.25;letter-spacing:-.03em}
#closing-link{position:absolute;left:110px;top:785px;font-size:34px;color:#e1e1d0}
`;
const bodies={
opening:`<h1 id="opening-title" class="gm-title"><span>A memecoin</span><span>with mechanics.</span></h1><img id="opening-art" src="assets/screens/machine-art.png" alt="Greed Machine scouts, security guardian and profit split"><div id="opening-journey"><span>BUY $GREED</span><span class="gm-arrow">→</span><span>HOLD</span><span class="gm-arrow">→</span><span>ELIGIBLE PROFIT</span></div>`,
funding:`<div id="funding-launch" class="funding-source"><p class="gm-label">Launch proceeds</p><span class="gm-arrow">→</span></div><div id="funding-fees" class="funding-source"><p class="gm-label">Project trading fees</p><span class="gm-arrow">→</span></div><div id="funding-retained" class="funding-source"><p class="gm-label">Retained earnings</p><span class="gm-arrow">→</span></div><div id="funding-treasury"><p class="gm-step">TREASURY</p><p class="gm-label">Working capital</p><p class="gm-copy">Strategies + protected reserves</p></div><p class="gm-footer">Capital funds the business. Earnings come from realized results.</p>`,
swarm:`<div id="swarm-scout" class="swarm-role"><p class="gm-step">01 / SCOUT</p><p class="gm-label">Discover</p><p class="gm-copy">Find yield and other opportunities.</p></div><div id="swarm-strategist" class="swarm-role"><p class="gm-step">02 / STRATEGIST</p><p class="gm-label">Propose</p><p class="gm-copy">Build a strategy from evidence.</p></div><div id="swarm-challenger" class="swarm-role"><p class="gm-step">03 / CHALLENGER</p><p class="gm-label">Debate</p><p class="gm-copy">Challenge assumptions and weak signals.</p></div><div id="swarm-candidate" class="gm-band">Candidate strategy → Independent security review</div>`,
security:`<div id="security-review" class="security-panel"><p class="gm-label">Independent review</p><ul><li>Evidence and data quality</li><li>Exposure and exit risk</li><li>Every proposal can be rejected</li></ul></div><div id="security-controls" class="security-panel"><p class="gm-label">Hard rules</p><ul><li>Spending caps + protected reserves</li><li>Restricted execution permissions</li><li>Emergency pause</li></ul></div><div id="security-keys" class="gm-band">AI agents never hold treasury keys.</div>`,
operations:`${[['allocate','Allocate','Bounded capital to approved strategies.'],['monitor','Monitor','Track positions, exposure and liquidity.'],['exit','Exit','Harvest or close within approved rules.'],['reconcile','Reconcile','Record realized results, costs and losses.']].map(([id,title,copy],i)=>`<div id="operations-${id}" class="operation"><p class="gm-step">0${i+1}</p><p class="gm-label">${title}</p><p class="gm-copy">${copy}</p></div>`).join('')}<p id="operations-profit">Realized result − operating costs − loss recovery = eligible net profit</p>`,
distribution:`<p id="distribution-share">60–70%</p><p id="distribution-basis">of eligible net profit</p><p id="distribution-target">Target range. Final economics to be set.</p><div id="distribution-holders"><p class="gm-label">Stablecoins → holders</p><p class="gm-copy">Automatic payouts, proportional to eligible holdings.</p></div><p id="distribution-retained">Remainder → treasury reserves + future activity</p>`,
closing:`<p id="closing-promise">A memecoin designed to do business.</p><p id="closing-link">github.com/greyw0rks/greed-machine</p>`
};
const reveals={opening:[['opening-journey',4.5]],funding:[['funding-launch',.3],['funding-treasury',.6],['funding-fees',2.8],['funding-retained',5.8]],swarm:[['swarm-scout',.3],['swarm-strategist',2.6],['swarm-challenger',4.6],['swarm-candidate',6.7]],security:[['security-review',.3],['security-controls',3.2],['security-keys',6.3]],operations:[['operations-allocate',.3],['operations-monitor',2.1],['operations-exit',4],['operations-reconcile',5.8],['operations-profit',5.4]],distribution:[['distribution-share',.3],['distribution-basis',.3],['distribution-target',.3],['distribution-holders',2.7],['distribution-retained',6.7]],closing:[['closing-promise',.5],['closing-link',2.3]]};
await mkdir('compositions',{recursive:true});
for(const [i,s] of scenes.entries()){
const title=s.id==='opening'?'':`<h1 id="${s.id}-title" class="gm-title" data-var-text="${s.id}-title">${esc(s.title)}</h1>`;
const animation=reveals[s.id].map(([id,at])=>`tl.fromTo('#${id}',{opacity:0},{opacity:1,duration:.4,ease:'power2.out'},${at});`).join('\n');
await writeFile(`compositions/${s.id}.html`,`<template><style>${css}</style><div id="root" data-dark="${!!s.dark}" data-composition-id="${s.id}" data-duration="${s.duration}" data-width="1920" data-height="1080"><p class="gm-brand">GREED MACHINE</p><p class="gm-chapter">${s.id==='opening'||s.id==='closing'?'THE CONCEPT':'INTENDED MECHANICS'} / 0${i+1}</p>${title}${bodies[s.id]}<div class="gm-rail"></div></div><script>const tl=gsap.timeline({paused:true});tl.to({}, {duration:${s.duration}},0);${animation}window.__timelines['${s.id}']=tl;</script></template>\n`);
}
const metadata=JSON.parse(await readFile('assets/audio/voice/metadata.json','utf8'));
const voices=request.lines.flatMap(line=>{const t=metadata[line.id];if(!t)return [];if(t.text!==line.text||t.start!==line.start||t.start+t.duration>line.end+.01)throw Error(`Stale voice take: ${line.id}`);return [`<audio id="voice-${line.id}" class="clip" src="${esc(t.path)}" data-start="${t.start}" data-duration="${t.duration}" data-volume="1" data-track-index="8"></audio>`]});
const variables=scenes.filter(s=>s.id!=='opening').map(s=>({id:s.id+'-title',type:'string',label:s.id+' title',default:s.title}));
await writeFile('index.html',`<!doctype html><html lang="en" data-composition-variables='${JSON.stringify(variables).replaceAll("'",'&#39;')}'><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Greed Machine — A memecoin with mechanics</title><script src="assets/gsap.min.js"></script><style>*{box-sizing:border-box;margin:0;padding:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#3f5138}#root{width:100%;height:100%;position:relative}.clip{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="60" data-fps="30" data-width="1920" data-height="1080">${scenes.map((s,i)=>`<div id="${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-width="1920" data-height="1080" data-track-kind="graphics" data-track-index="1" style="z-index:${i+1}"></div>`).join('\n')}${voices.join('\n')}<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="60" data-track-kind="captions" data-track-index="9" data-width="1920" data-height="1080" style="z-index:20"></div></div><script>window.__timelines.main=gsap.timeline({paused:true}).to({}, {duration:60},0);</script></body></html>\n`);
await writeFile('scenes.json',JSON.stringify(scenes,null,2)+'\n');
console.log(`Built ${scenes.length} concept scenes; ${voices.length}/${request.lines.length} matching voice takes.`);
