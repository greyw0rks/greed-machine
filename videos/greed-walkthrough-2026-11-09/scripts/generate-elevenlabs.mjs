import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Credentials are read at runtime and never written into the media manifest.
const option = name => process.argv.find(x => x.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
let key = process.env.ELEVENLABS_API_KEY;
if (!key && option('key-file')) {
  const source = await readFile(option('key-file'), 'utf8');
  const match = source.match(/^\s*(?:export\s+)?eleven[ _-]*labs(?:[ _-]*(?:api[ _-]*)?key)?\s*[:=]\s*(.+)$/im);
  key = match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}
if (!key) throw new Error('ELEVENLABS_API_KEY is missing; supply an environment variable or --key-file.');
const headers = {'xi-api-key': key, 'content-type': 'application/json'};
async function api(endpoint, body) {
  let response;
  try {
    response = await fetch(`https://api.elevenlabs.io${endpoint}`, {
      method: body ? 'POST' : 'GET', headers,
      ...(body ? {body: JSON.stringify(body)} : {}),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    throw new Error(`ElevenLabs network request failed (${error.cause?.code ?? error.name}). A generation request may have been accepted; inspect its pending record before retrying.`);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const code = typeof error.detail === 'object' ? error.detail?.status : undefined;
    throw new Error(`ElevenLabs returned HTTP ${response.status}${code ? ` (${code})` : ''}. No automatic retry was sent.`);
  }
  return response.json();
}
const voiceId = option('voice') ?? 'SAz9YHcvj6GT2YYXdXww';
if (process.argv.includes('--preflight')) {
  const voice = await api(`/v1/voices/${voiceId}`);
  console.log(JSON.stringify({available: true, voiceId: voice.voice_id, name: voice.name, category: voice.category, labels: voice.labels}, null, 2));
  process.exit(0);
}

const source = JSON.parse(await readFile('narration-elevenlabs.json', 'utf8'));
const directory = 'assets/audio/elevenlabs';
await mkdir(directory, {recursive: true});
const metadata = {};
for (const line of source.lines) {
  const request = {
    text: line.text,
    model_id: source.model,
    voice_settings: {stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 1},
    previous_text: source.lines.filter(x => x.start < line.start).at(-1)?.text,
    next_text: source.lines.find(x => x.start > line.start)?.text,
  };
  const signature = createHash('sha256').update(JSON.stringify({voiceId, request})).digest('hex');
  const recordPath = `${directory}/${line.id}.json`;
  const prior = await readFile(recordPath, 'utf8').then(JSON.parse).catch(() => null);
  if (prior && (prior.signature !== signature || prior.status !== 'complete')) {
    throw new Error(`${line.id}: a different or unresolved request exists. Inspect it before starting another generation.`);
  }
  let record = prior;
  if (!record) {
    await writeFile(recordPath, JSON.stringify({status: 'pending', signature, provider: 'elevenlabs', requestedAt: new Date().toISOString()}, null, 2) + '\n');
    const result = await api(`/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, request);
    if (!result.audio_base64 || !result.alignment?.characters?.length) throw new Error(`${line.id}: audio or native character timing missing. Inspect the pending record before retrying.`);
    const mediaPath = `${directory}/${line.id}.mp3`;
    await writeFile(mediaPath, Buffer.from(result.audio_base64, 'base64'));
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mediaPath], {encoding: 'utf8'}).trim());
    record = {status: 'complete', signature, provider: 'elevenlabs', model: source.model, voiceId, path: mediaPath, text: line.text, start: line.start, duration, alignment: result.alignment, normalizedAlignment: result.normalized_alignment};
    await writeFile(recordPath, JSON.stringify(record, null, 2) + '\n');
  }
  if (!Number.isFinite(record.duration) || record.duration <= 0 || line.start + record.duration > line.end) throw new Error(`${line.id}: narration does not fit the scene; extend its hold rather than speeding up speech.`);
  metadata[line.id] = record;
  console.log(`${line.id}: ${record.duration.toFixed(3)} seconds, native character timings saved.`);
}
await writeFile(`${directory}/metadata.json`, JSON.stringify(metadata, null, 2) + '\n');
console.log('All eight ElevenLabs takes are complete.');
