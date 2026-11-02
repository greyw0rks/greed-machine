# Third-party notices

Original project code and documentation use the root MIT license. Third-party software and fonts retain their upstream licenses. The source-code license grants no rights to personal voice recordings, likenesses or third-party trademarks.

## Application

- **Geist / Geist Mono**, Vercel: bundled fonts in `public/fonts/`. SIL Open Font License 1.1; see [the included license](public/fonts/OFL.txt) and https://github.com/vercel/geist-font.
- **Next.js, React, Three.js, React Three Fiber/Drei, Motion, Radix, Tailwind, Lucide, Recharts, Zod, NEAR API/SDK, Playwright and related packages**: versions and dependencies are recorded in `package-lock.json`. Their upstream package licenses apply.
- **NEAR SDK and Rust dependencies**: versions are recorded in the Cargo lockfiles under `contracts/`. Their upstream crate licenses apply.

## Video authoring

The new video sources remain local pending final caption/playback review and builder export. The earlier verified concept film and editable source in `demo-video/` are already published. These notices describe the tools and assets used; they do not certify a final export.

- **GSAP**, GreenSock: `demo-video/assets/gsap.min.js` and local video projects retain bundled script copyright/license headers. See https://gsap.com/standard-license.
- **HyperFrames**: the older concept project pins 0.8.210; the current November 2 concept and walkthrough projects pin 0.9.4. The CLI is not vendored or relicensed by this repository.
- **KittenTTS 2**: generated narration uses `KittenML/kitten-tts-2`; local generation metadata records model revision, source hashes and seeds. Published processed takes are in `demo-video/assets/audio/voice/`, with generation metadata beside them. Model weights, private voice-reference recordings and personal reference transcripts are not distributed. See https://huggingface.co/KittenML/kitten-tts-2 for upstream terms before regenerating audio.
- **Geist / Geist Mono**: video fonts use the same SIL Open Font License noted above; `demo-video/assets/fonts/OFL.txt` is also included.

AI-assisted code, documentation and narration are disclosed. Project illustrations are existing project artwork. Generated media does not establish independent review, market returns or production payouts.
