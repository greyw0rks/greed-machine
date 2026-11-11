# Actual-app walkthrough

An 80-second demonstration of the working simulation and the separate completed NEAR testnet rehearsal. Product screens are real browser recordings. River narration was generated with ElevenLabs at the user's request; native character timings drive the sentence captions.

The demo uses unbacked tokens and sponsor-funded fixture returns. See [the judge guide](../../docs/JUDGE_GUIDE.md), [storyboard](STORYBOARD.md), [asset provenance](ASSETS.md) and [review](REVIEW.md).

The [exported film](../../docs/demo-assets/greed-machine-walkthrough.mp4) and [delivery check](../../docs/demo-assets/walkthrough-delivery-check.json) are included. Human listening remains before posting.

## Edit and export

Node.js 22+, FFmpeg and the pinned HyperFrames CLI are required. All playback media is included locally; preview and export need no ElevenLabs credential.

```sh
npm run preview
npm run check -- --json
npm run render -- --quality delivery -o output/walkthrough.mp4
```

The HyperFrames desktop app can continue editing this project. To rebuild the HTML and captions from saved media:

```sh
node scripts/build-film.mjs
node scripts/build-captions.mjs
```

With Python 3 and FFmpeg installed, verify an encoded export using `python3 scripts/verify-delivery.py /path/to/walkthrough.mp4`. The default verifies the included film. It checks the complete decode, native audio levels and caption timing, then writes a delivery report next to the film.

The capture script at [scripts/capture-judge-walkthrough.mjs](../../scripts/capture-judge-walkthrough.mjs) records an isolated simulation ledger and reads the preserved public NEAR proof. Raw recordings remain local. The processed clips and edit manifest preserve the final edit, including a shortened RPC wait.

Generating new audio requires your own ElevenLabs credential. `scripts/generate-elevenlabs.mjs` accepts `ELEVENLABS_API_KEY` or `--key-file=/path/to/private-file`, records pending requests before dispatch, and reuses complete matching takes. It refuses to repeat unresolved generation calls automatically. Credentials never enter the composition or asset metadata.
