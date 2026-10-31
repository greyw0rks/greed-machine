# Greed Machine demo

The 60-second film explains Greed Machine's concept: a memecoin with mechanics, treasury funding, an AI swarm, independent security, bounded strategy execution and intended stablecoin profit sharing. It uses the existing swarm illustration and local KittenTTS 2 narration. The 60–70% holder share is a target range; the exact economics remain to be set.

The project is 1920×1080 at 30 fps. [SPEC.md](SPEC.md) and [STORYBOARD.md](STORYBOARD.md) describe the concept direction; [narration.json](narration.json) contains the script.

The builder's October 28 [final concept MP4](../docs/demo-assets/greed-machine-demo.mp4) was located and verified October 31. It has 1,800 H.264 frames, stereo AAC audio, 23 caption cues, -18.67 dB RMS / -1.35 dB peak and no clipped decoded samples. Seven scene samples match the concept script; the previous walkthrough is archived privately. No rerender was performed. See [delivery verification](../docs/demo-assets/video-delivery-check.json).

The saved October 28 HyperFrames 0.8.210 browser check passes with zero errors or warnings. The opener, all seven scenes, the profit formula at 42 seconds and the closing hold at 59.9 seconds were inspected. The [composition report](../docs/demo-assets/video-composition-check.json) records that review. No composition was changed during October 31 delivery preparation.

The processed voice takes are included. After changing narration or caption timing, rebuild and check the film:

```bash
node scripts/build-captions.mjs
node scripts/build-film.mjs
npm run check
```

Use Node.js 22+, FFmpeg and Chromium. Scripts pin HyperFrames 0.8.210, upgraded from 0.8.209 for this review. The persistent Studio preview is [localhost:3004](http://localhost:3004/#project/demo-video). To restart it:

```bash
npx --yes hyperframes@0.8.210 preview --background --port 3004 --no-open
npx --yes hyperframes@0.8.210 preview --status
```

Render and export from Studio when ready, or use:

```bash
npm run render -- --quality delivery --output ../docs/demo-assets/greed-machine-demo.mp4
```

To regenerate narration, install KittenTTS 2 in a separate Python environment and cache `KittenML/kitten-tts-2`. Supply your own private reference WAV and accurate transcript through `--reference` and `--reference-text`; the original reference recording and transcript are excluded from the repository. The local default paths are conveniences for the original author. Raw takes are ignored.

```bash
python scripts/generate_narration.py --cpu-int8 --reference /path/to/private-reference.wav --reference-text /path/to/private-transcript.txt
python scripts/prepare_narration.py
python scripts/assemble_narration.py
python scripts/transcribe_narration.py --model openai/whisper-medium.en
python scripts/align-captions.py
node scripts/build-captions.mjs
node scripts/build-film.mjs
```

Matching takes are reused before loading the model. Transcription is a separate local quality check using Transformers and a cached Whisper model. Original recognizer output is preserved; script alignment and caption grouping are separate artifacts. Review the recognizer differences before rebuilding captions. Sound was measured and transcribed; the authoring agent did not listen to playback.
