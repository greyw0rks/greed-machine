import { readFile, writeFile, mkdir } from 'node:fs/promises';

// The reviewed word file preserves Whisper's timing and records text corrections.
// Keep assets/transcript.json unchanged so the original recognition is inspectable.
const transcript = JSON.parse(await readFile('assets/caption-words.json', 'utf8'));
const words = transcript.words;
const request = JSON.parse(await readFile('narration.json', 'utf8'));
for (const line of request.lines) {
  const actual = words.filter(word => word.line === line.id).map(word => word.text).join(' ');
  if (actual !== line.text) throw new Error(`Caption script is stale: ${line.id}`);
}
if (words.some(word => !request.lines.some(line => line.id === word.line))) {
  throw new Error('Captions contain an obsolete scene.');
}
const groups = [];
let pending = [];
const flush = () => {
  if (pending.length) {
    groups.push({
      start: pending[0].start,
      speechEnd: pending.at(-1).end,
      line: pending[0].line,
      text: pending.map(word => word.text).join(' '),
    });
    pending = [];
  }
};
for (let i = 0; i < words.length; i++) {
  const word = words[i];
  if (!word.text || !Number.isFinite(word.start) || !Number.isFinite(word.end)
      || word.start < 0 || word.end <= word.start || word.end > 60) {
    throw new Error(`Invalid caption word ${i}`);
  }
  if (pending.length && (pending[0].line !== word.line
      || word.start - pending.at(-1).end > 0.2)) flush();
  pending.push(word);
  const sentenceEndsSoon = words.slice(i + 1, i + 3).some(next =>
    next.line === word.line && /[.!?;]$/.test(next.text));
  if ((pending.length >= 6 && !sentenceEndsSoon) || /[.!?;]$/.test(word.text)) flush();
}
flush();
for (let i = 0; i < groups.length; i++) {
  const group = groups[i];
  group.end = i === groups.length - 1 ? 60 : Math.min(group.speechEnd + 0.15, groups[i + 1].start);
  if (group.end <= group.start || (i && group.start < groups[i - 1].end)) {
    throw new Error(`Caption overlap or empty group ${i}`);
  }
}
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const timestamp = seconds => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const paragraphs = groups.map((group, i) => `<p id="caption-${i}" class="caption-group" data-layout-allow-caption-zone>${escape(group.text)}</p>`).join('\n');
const timeline = groups.map((group, i) => `tl.set('#caption-${i}',{visibility:'visible',opacity:1},${group.start});tl.set('#caption-${i}',{visibility:'hidden',opacity:0},${group.end});`).join('\n');
const html = `<template>
<style>
@font-face{font-family:Geist;src:url('assets/fonts/GeistVF.woff');font-weight:100 900}
#root{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.caption-group{position:absolute;left:110px;right:110px;top:938px;height:66px;display:flex;align-items:center;justify-content:center;font:500 42px/1.25 Geist,sans-serif;color:#262820;background:#f3efe5;text-align:center;visibility:hidden;opacity:0}
</style>
<div id="root" data-composition-id="captions" data-duration="60" data-width="1920" data-height="1080">${paragraphs}</div>
<script>
const tl=gsap.timeline({paused:true});
${timeline}
window.__timelines.captions=tl;
</script>
</template>\n`;
await mkdir('compositions', { recursive: true });
await writeFile('compositions/captions.html', html);
await writeFile('assets/captions.json', JSON.stringify({source: transcript.source, groups}, null, 2) + '\n');
await writeFile('greed-machine-kitten2.srt', groups.map((group, i) => `${i + 1}\n${timestamp(group.start)} --> ${timestamp(group.end)}\n${group.text}\n`).join('\n'));
console.log(`Built ${groups.length} caption groups and matching SRT.`);
