# Greed Machine checkpoint — October 26, 2026

The user confirmed that eligibility is acceptable and asked to complete the NEAR hackathon requirements. Live https://nearhackathon.com/HACKATHON.md was read again: submissions open November 1 at 00:00 UTC and close November 14 at 23:59 UTC. No API submission has been attempted.

## Completed and verified

- The public simulation foundation and earlier NEAR policy/token evidence remain preserved.
- The separate NEAR business rehearsal is implemented and verified locally. It settles actual NEP-141 demo-token transfers between compiled treasury, vault and token contracts.
- Launch-fixture principal, fee-fixture revenue and a unique operating invoice are accounted separately. Spending limits, fixed reserves, a restricted operator key and guardian pause protect the bounded action.
- Full token receipt history reconstructs a pinned GREED holder snapshot. A 60-second period freezes exact entitlements; a later transfer cannot change them.
- A failed receiver keeps its liability until sponsored registration and retry. Paid entitlements reject replay. An ambiguous broadcast is recovered by its saved transaction hash without another signature/send.
- `npm run verify`: 54/54 application tests, TypeScript and production build passed.
- `npm run business:build`: all three Rust projects built successfully; the demo-token build is used for both gUSD and GREED.
- `npm run business:check`: 25/25 isolated compiled NEAR Sandbox checks passed. Final treasury: 1,004.55 gUSD; holder payments: 8.45 gUSD; unpaid liabilities: zero.
- `npm run business:ui`: four desktop/mobile proof and navigation checks passed, no page errors. Screenshots and report are in `docs/demo-assets/`.
- README explains the problem, NEAR's role, exact judge actions, Rust prerequisites, evidence boundaries and recommended tracks. The demo copy fits one X post with room for a shortened repository link.

The recorded gas-cost field was corrected to `nearGasCostYocto`; it represents token burn in yoctoNEAR. Future rehearsal exports also record gas units separately. This reporting correction does not change contract behavior or send any transaction.

## Confirmed public completion and current work

The user confirmed both public steps. The public business rehearsal completed October 25 at 22:47:12 UTC: all 11 checks passed. An independent finalized observation at 23:06:35 UTC reconciles pinned builds, treasury ledger, 1,004.55 gUSD cash, 8.45 gUSD holder payments and zero unpaid liabilities. Evidence is in `evidence/business-testnet.json` and `evidence/business-testnet-observation.json`. Preserve this completed run; do not deploy or pay it again.

Guardian gas recovery used 0.13 test NEAR from the existing setup buffer. The pause finalized under its original signed hash after a definite insufficient-balance rejection and gas funding. No replacement signature or run ID was created. Plain token transfers now attach 30 Tgas; treasury actions preserve their original journaled 180 Tgas.

The requested olive/ivory/charcoal/amber palette is implemented across the site, Three.js and reduced-motion fallback. The production build and 18 desktop/mobile foundation captures pass; four refreshed public business captures pass with no page errors.

Approved repository: `https://github.com/greyw0rks/greed-machine`, branch `main`. Publication remains pending. Local credentials, signed journals and databases are ignored and excluded from frontend traces. Initial reviewed source is saved in local commit `26e4316`; public evidence, palette and demo changes must be included in the next reviewed commit.

The user requested the demo file with captions and local KittenTTS 2 narration. `demo-video/` contains the selected seven-scene, 60-second landscape film, real public app captures and generation/reproduction tools. Opening and swarm takes are preserved; the other five takes are generating from the cached model and existing private voice reference. Raw takes are ignored. HyperFrames was upgraded from 0.8.200 to 0.8.201 and its composition check passed. Complete and inspect captions, narration and the MP4 before marking the video done.

1. Finish the captioned Kitten2 demo. Validate the full composition, inspect decoded delivery frames and measure audio.
2. Review and publish source, public evidence and final demo to the already-approved GitHub destination. Exclude private reference media, credentials, journals and databases.
3. The human publishes their X demo post with screenshots/video and supplies its public URL.
4. Collect human-confirmed project name, lead name, email, team-size category, tracks, mainnet prize account and description. Arc/Clerk emails and testnet accounts are not assumed to be submission fields.
5. Ask whether the team already submitted, read the contact notice verbatim and obtain agreement. Re-read live rules, validate every exact API field, generate and preserve one requestId, display the full payload and wait for explicit confirmation. Submit only during the open window. Keep personal payloads outside the repository.

See [submission-checklist.md](submission-checklist.md) and [demo-post-draft.md](demo-post-draft.md).

## Boundaries and recovery

gUSD is unbacked, launch/fee/vault returns are sponsor fixtures, the 65/35 split is illustrative, and the holder snapshot is operator-attested within an immutable roster. External DeFi integration, market fee routing and production economics remain unfinished. Model agents receive no keys.

Keep `.near/business-transactions.json` and its decision/snapshot files if public execution is interrupted. Preserve the exact request, original transaction bytes and hash; an unknown status stops the runner. Never replace an uncertain payment or create a new run ID to bypass it.

Tests and browser captures use temporary databases and local/mock providers. The normal demo database, earlier testnet evidence and scheduler state were not changed by this work. The scheduler remains disabled. Public business signing is complete under the confirmed plan. No mainnet action, repository push, X post or submission has occurred at this checkpoint.
