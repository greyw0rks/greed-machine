# Greed Machine checkpoint — November 11, 2026

## Current handoff

**Already submitted.** The live directory lists entry `4e50d9a7-3ef3-4a68-9307-01d46c96e184`, with https://x.com/Greyw0rks/status/2117323746600161676 and tracks defi/business/swarms/security/agents/memecoins. Older unsubmitted instructions below are historical and superseded. Use Request changes for corrections; do not send a new application.

The user requested fixes after the [November 9 review](hackathon-review-2026-11-09.md) and chose to finish the honest testnet package. This revision adds an [app-only judge guide](JUDGE_GUIDE.md), links it from the simple README, fixes the submission-status handoff and prepares accurate walkthrough/post/description material. Production revenue, fee routing, live DeFi and USDC payouts remain future work.

The application code is unchanged. November 9 review verification passed 54 application tests, TypeScript, production build, 18 foundation browser captures and four proof checks. Public `main` at `30cf44d` matched 105 implementation/configuration files. Read-only NEAR verification reconciled 1,004.55 gUSD treasury, 8.45 paid and zero liabilities at finalized block 276840299, observed 2026-11-08T23:08:16.290Z. These application checks were not rerun for the documentation/media publication.

The [80-second actual-app walkthrough](demo-assets/greed-machine-walkthrough.mp4) is exported, with editable source in `videos/greed-walkthrough-2026-11-09/`. It uses real browser captures, ElevenLabs River narration, 18 aligned caption groups and read-only verification at finalized block 276844141. HyperFrames 0.9.5 checks passed with zero errors and warnings. The [delivery report](demo-assets/walkthrough-delivery-check.json) verifies the encoded file, complete decode, audio levels and caption timing. Human listening remains before posting. Earlier concept exports remain preserved. The normal database, disabled scheduler and private signing journals must remain untouched.

The user authorized publication of the judge guide, corrected documentation, walkthrough source and existing export on November 10, and asked to finish on November 11. This revision publishes that package from `/home/greyw0rks/greed-machine-submission-20261102` on `codex/greed-judge-fixes-20261109`, based on public `main`. November 11 checks passed for all 79 staged files, 68 local documentation links and 26 composition/media references, with no credential-pattern findings or whitespace errors. Fresh complete-decode, audio-level and caption-timing verification reproduced the delivery report and film SHA-256 `6e2b4ac27c8820ed074d5b5f846fbce95364faadc69230437280e43bc16dd1ca`. The original workspace's older Git branch and unrelated media changes remain preserved. Remaining human steps are listening to the film, publishing the tagged X walkthrough and requesting a correction to the existing entry's demo URL. No replacement post or organizer change request has been sent by this work.

## Archived November 2 handoff

All submission-status and next-step statements in this historical section are superseded by the current handoff above.

# Greed Machine checkpoint — November 2, 2026

## Current handoff

The builder asked to resume and finish the repository/submission package and explicitly took responsibility for rendering and exporting the videos. They confirmed that Greed Machine has not been submitted and is their only entry in this NEAR hackathon.

Live rules were fetched November 2 and refreshed in `docs/HACKATHON.md`. Development from October 19 is eligible; submissions close November 14 at 23:59 UTC. The current rules require `@NEARProtocol`, `#NEARHackathon` and “built at NEAR HACKATHON” in the X post, and a video for a local-only demo. The repository is submitted once; the contact-email limit is two independent entries rather than the older one-team rule.

The application, contracts and preserved public rehearsal are complete. MIT licensing, attribution, judge development-scope links, X copy, a separate form description and the remaining-step checklist are prepared for publication. The source history begins October 25 at `26e4316`; no earlier tracked baseline exists. A dedicated `near-hackathon-2026` branch identifies the entry, with the initial implementation and follow-up diff linked in README.

The current local video projects are `videos/greed-concept-2026-11-02` (60 seconds) and `videos/greed-walkthrough-2026-11-02` (80 seconds), now pinned to HyperFrames 0.9.4. Their notes still mark final captions and complete playback review pending. They remain local work pending that review and the builder's export. The earlier concept film and editable `demo-video/` source are already published in `7afd9a5`; preserve that delivery. The published `demo-video` and existing MP4 are the earlier verified October 28 concept cut and must not be labelled as the new delivery. No video render/export was performed in this resumption.

The builder next exports/reviews the walkthrough and publishes the X post, then completes the human submission fields. Use `docs/YOUR_NEXT_STEPS.md`, `docs/submission-description.md` and `docs/submission-checklist.md`. Do not invent identity, email, mainnet payout account, tracks, consent or public post URL. No X post, submission, new public financial transaction or mainnet action has been sent. Preserve the normal database, ignored signing journal and disabled scheduler.

Fresh November 2 verification passed all 54 application tests, TypeScript and the production webpack build. The submission package checks confirm a 254-character weighted X post, a 1,143-character description and resolving local documentation links.

Repository recovery: public `main` was already at `7afd9a5` (October 31), while the original workspace was still based on `716c130`. This update is prepared in `/tmp/greed-submission-package-20261102` on `codex/greed-submission-package-20261102`, based on the existing public update. The builder’s working video files in the original workspace are preserved. Use the published branch/history when resuming repository work; do not push the old local `main` over it.

## Preserved October 31 delivery handoff

# Greed Machine checkpoint — October 31, 2026

The builder asked to finish everything possible, then leave personal posting and submission to them. The definitive handoff is [YOUR_NEXT_STEPS.md](YOUR_NEXT_STEPS.md).

## Completed in this revision

- Found the builder’s October 28 concept export and copied it to `docs/demo-assets/greed-machine-demo.mp4`. The older walkthrough is preserved privately under `.archive/`. Do not rerender.
- Verified 60 seconds, 1,800 H.264 frames at 1920×1080/30 fps, stereo AAC, 23 ordered caption cues, -18.67 dB RMS, -1.35 dB peak and zero clipped native decoded samples. Reviewed all seven scene samples. Saved `docs/demo-assets/video-delivery-check.json`.
- Fixed the delivery checker’s artificial stereo-downmix gain; the film itself was unchanged. Source-composition verification remains the saved October 28 HyperFrames 0.8.210 result with no errors/warnings.
- Added MIT LICENSE, third-party notices and Geist OFL; documented public revision history, reused libraries and AI assistance in README.
- Prepared the concept film, editable source, tagged X copy and truthful submission description for the already-authorized public GitHub repository. Private voice references, keys, databases, journals and caches are excluded. The separate experimental brag-video remains local.
- Re-read and saved current NEAR rules. They accept testnet-only work and a local-only demo with public repo, reproducible README and X video. Required X tags are @NEARProtocol and #NEARHackathon. Work from October 19 is eligible; earlier baseline/reuse must be disclosed.

## Existing verified implementation

The simulation foundation, authenticated wallet/governance proof, provider cost accounting and recovery are complete. The compiled business rehearsal passed 25 Sandbox checks. The public testnet rehearsal completed October 25 with 11 checks and independent finalized observation: 1,004.55 unbacked gUSD treasury, 8.45 gUSD holder payments and no unpaid liabilities. Saved evidence is `evidence/business-testnet.json` and `evidence/business-testnet-observation.json`; preserve signed journals and never replay the run.

The last application verification (October 27) passed 54 tests, TypeScript/build, 18 foundation captures and four business captures. October 31 changes are documentation/media and the video checker; application and chain tests were not rerun. No production trading, mainnet payout or external DeFi return is claimed. Exact economics, launchpad/fee routing, live adapters, arbitrary holder indexing and production stablecoin distributions remain future work; 65/35 is illustrative.

## Left to the builder

1. Watch the exported film with sound and publish the prepared tagged X video post. Supply its public URL.
2. Confirm project/team/contact, team-size category, tracks, own mainnet NEAR prize account, description and contact consent in the official form.
3. Submit once per project during November 1–14; deadline November 14 at 23:59 UTC / November 15 at 00:59 Lagos. If using the API, show the exact payload and obtain explicit confirmation before sending; preserve one requestId for retries. No successful submission is recorded here.

The scheduler remains disabled. No mainnet action, new testnet payment, social post or hackathon form submission occurred in delivery preparation.
