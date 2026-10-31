"""Verify the decoded Greed MP4, narration levels and subtitle timing."""

import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
FILM = PROJECT.parent / 'docs/demo-assets/greed-machine-demo.mp4'


def main():
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams',
        '-of', 'json', str(FILM),
    ]))
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    audio = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
    assert video['codec_name'] == 'h264'
    assert audio['codec_name'] == 'aac'
    assert (video['width'], video['height']) == (1920, 1080)
    assert video['avg_frame_rate'] == '30/1'
    assert int(video['nb_frames']) == 1800
    assert abs(float(video['duration']) - 60) < 0.04
    assert abs(float(probe['format']['duration']) - 60) < 0.1

    samples = np.frombuffer(subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(FILM), '-vn', '-f', 'f32le', '-',
    ]), dtype=np.float32)
    assert len(samples) and np.isfinite(samples).all()
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples ** 2)))
    peak_db = float(20 * np.log10(peak))
    rms_db = float(20 * np.log10(rms))
    assert -4 < peak_db < 0, 'Encoded audio must be audible and below clipping.'
    assert -25 < rms_db < -12, 'Narration level must remain consistent.'

    captions = json.loads((PROJECT / 'assets/captions.json').read_text())['groups']
    last_end = 0
    for group in captions:
        assert last_end <= group['start'] < group['end'] <= 60
        assert group['text'].strip()
        last_end = group['end']
    assert (PROJECT / 'greed-machine-kitten2.srt').read_text().count(' --> ') == len(captions)

    # Decode the actual delivery around every cut as well as scene midpoints.
    frames = PROJECT / 'renders/decoded'
    frames.mkdir(parents=True, exist_ok=True)
    times = [0, 4.5, 13.5, 22.5, 31.5, 40.5, 49.5, 57, 59.9]
    for seam in [9, 18, 27, 36, 45, 54]:
        times.extend([seam - 1 / 30, seam, seam + 1 / 30])
    times = sorted(set(times))
    for index, at in enumerate(times):
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-ss', f'{at:.6f}', '-i', str(FILM),
            '-frames:v', '1', str(frames / f'{index:02d}-at-{at:.3f}.png'),
        ], check=True)

    report = {
        'passed': True,
        'file': 'docs/demo-assets/greed-machine-demo.mp4',
        'sha256': hashlib.sha256(FILM.read_bytes()).hexdigest(),
        'bytes': FILM.stat().st_size,
        'video': {'codec': 'h264', 'width': 1920, 'height': 1080, 'fps': 30,
                  'frames': 1800, 'duration': float(video['duration'])},
        # Measure the native decoded channels: FFmpeg's default stereo-to-mono
        # matrix can add 3 dB to dual-mono narration and invent clipping.
        'audio': {'codec': 'aac', 'channels': int(audio['channels']),
                  'sampleRate': int(audio['sample_rate']), 'measurement': 'native decoded channels; no downmix',
                  'peakDb': round(peak_db, 2),
                  'rmsDb': round(rms_db, 2), 'clippedSamples': int(np.sum(np.abs(samples) >= 1))},
        'captionGroups': len(captions),
        'decodedFrameTimes': times,
        'audioReview': 'Measured and transcribed; no claim of listening to playback.',
    }
    assert report['audio']['clippedSamples'] == 0
    (FILM.parent / 'video-delivery-check.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
