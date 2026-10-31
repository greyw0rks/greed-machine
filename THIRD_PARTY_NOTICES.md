# Third-party notices

The root MIT license covers original project code and documentation. Third-party software and fonts retain their own licenses; no rights to a person's voice, likeness or project trademarks are granted by the source-code license.

- **Geist / Geist Mono**, Vercel: bundled fonts in `public/fonts/` and `demo-video/assets/fonts/`. SIL Open Font License 1.1; see `public/fonts/OFL.txt` and https://github.com/vercel/geist-font.
- **GSAP 3.14.2**, GreenSock: `demo-video/assets/gsap.min.js`. Copyright/license header retained. Governed by https://gsap.com/standard-license, not the root MIT license.
- **Next.js, React, Three.js, React Three Fiber/Drei, Motion, Radix, Tailwind, Lucide, Recharts, Zod, NEAR API/SDK and related packages**: resolved versions and dependencies are recorded in `package-lock.json` and the Rust Cargo lockfiles. Their upstream package licenses apply.
- **HyperFrames 0.8.210**: the video project pins the authoring/rendering CLI. It is not vendored or relicensed by this repository.
- **KittenTTS 2**: generated narration uses `KittenML/kitten-tts-2`, revision recorded in `demo-video/assets/audio/voice/metadata.json`. Model weights and private voice-reference recordings/transcripts are not distributed here. Consult https://huggingface.co/KittenML/kitten-tts-2 for upstream model terms before regenerating audio.

The concept illustration is existing project artwork, reused by the film. AI-assisted code, copy and generated narration are disclosed; they do not establish independent review, real strategy returns or production payouts.
