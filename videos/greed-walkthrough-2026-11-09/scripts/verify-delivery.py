"""Verify the actual encoded walkthrough; measure sound without claiming listening."""
import hashlib
import json
import math
from array import array
from pathlib import Path
import subprocess
import sys

PROJECT = Path(__file__).resolve().parents[1]
FILM = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else PROJECT.parents[1] / 'docs/demo-assets/greed-machine-walkthrough.mp4'

probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(FILM)]))
video = next(x for x in probe['streams'] if x['codec_type'] == 'video')
audio = next(x for x in probe['streams'] if x['codec_type'] == 'audio')
assert video['codec_name'] == 'h264' and audio['codec_name'] == 'aac'
assert (video['width'], video['height']) == (1920, 1080)
assert video['avg_frame_rate'] == '30/1' and int(video['nb_frames']) == 2400
assert abs(float(video['duration']) - 80) < .04
assert abs(float(probe['format']['duration']) - 80) < .1
subprocess.run(['ffmpeg', '-v', 'error', '-i', str(FILM), '-f', 'null', '/dev/null'], check=True)

# Preserve native decoded channels; a default mono downmix can add false gain.
samples = array('f')
samples.frombytes(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(FILM), '-vn', '-f', 'f32le', '-']))
if sys.byteorder != 'little':
    samples.byteswap()
channels, rate = int(audio['channels']), int(audio['sample_rate'])
assert len(samples) and len(samples) % channels == 0 and all(math.isfinite(x) for x in samples)
peak = max(abs(x) for x in samples)
rms = math.sqrt(sum(x * x for x in samples) / len(samples))
assert peak > .05 and peak < 1, 'Sound must be present and below clipping.'
assert sum(abs(x) >= 1 for x in samples) == 0

request = json.loads((PROJECT / 'narration.json').read_text())
voices = json.loads((PROJECT / request['metadata']).read_text())
voice_levels = []
for line in request['lines']:
    take = voices[line['id']]
    segment = samples[round(line['start'] * rate) * channels:round((line['start'] + take['duration']) * rate) * channels]
    level = 20 * math.log10(math.sqrt(sum(x * x for x in segment) / len(segment)))
    assert -35 < level < -10, f"{line['id']}: unexpected voice level {level}"
    voice_levels.append({'id': line['id'], 'rmsDb': round(level, 2)})

captions = json.loads((PROJECT / 'assets/captions.json').read_text())['groups']
last_end = 0
for group in captions:
    assert last_end <= group['start'] < group['end'] <= 80
    assert group['text'].strip()
    last_end = group['end']
assert (PROJECT / 'greed-machine-elevenlabs.srt').read_text().count(' --> ') == len(captions) == 18

scenes = json.loads((PROJECT / 'scenes.json').read_text())
times = [0, 11, 12, 31, 36, 38, 64, 67, 70, 79.9]
times += [x['start'] + x['duration'] / 2 for x in scenes]
for scene in scenes[1:]:
    times += [scene['start'] - 1 / 30, scene['start'], scene['start'] + 1 / 30]
times = sorted(set(times))
frames = PROJECT / 'output/decoded'
frames.mkdir(parents=True, exist_ok=True)
for index, at in enumerate(times):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{at:.6f}', '-i', str(FILM), '-frames:v', '1', str(frames / f'{index:02d}-at-{at:.3f}.png')], check=True)

report = {
    'passed': True, 'file': 'docs/demo-assets/greed-machine-walkthrough.mp4',
    'sha256': hashlib.sha256(FILM.read_bytes()).hexdigest(), 'bytes': FILM.stat().st_size,
    'video': {'codec': 'h264', 'width': 1920, 'height': 1080, 'fps': 30, 'frames': 2400, 'duration': float(video['duration']), 'completeDecodePassed': True},
    'audio': {'provider': 'ElevenLabs', 'voice': 'River', 'model': request['model'], 'codec': 'aac', 'channels': channels, 'sampleRate': rate, 'measurement': 'native decoded channels; no downmix', 'peakDb': round(20 * math.log10(peak), 2), 'rmsDb': round(20 * math.log10(rms), 2), 'clippedSamples': 0, 'voiceLevels': voice_levels},
    'captionGroups': len(captions), 'captionTimingSource': 'ElevenLabs native character alignment',
    'decodedFrameTimes': times, 'audioReview': 'Sound measured, not heard. Human listening remains before posting.',
}
report_path = FILM.parent / 'walkthrough-delivery-check.json'
report_path.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
