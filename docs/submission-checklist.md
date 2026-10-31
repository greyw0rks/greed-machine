# NEAR HACKATHON submission preparation

Rules source: [live HACKATHON.md](https://nearhackathon.com/HACKATHON.md), checked and [saved](HACKATHON.md) October 31, 2026. Re-read the live version immediately before submission. Work from the October 19 announcement is eligible; earlier work is baseline and must be disclosed.

Submission window: November 1, 2026 at 00:00 UTC through November 14 at 23:59 UTC. The deadline is November 15 at 00:59 Africa/Lagos. There is no preliminary signup. Submit each project/repository once; a person may submit at most two independent projects, with mutual README disclosure if applicable.

- [x] Complete and verify the compiled business-cycle rehearsal: 25 Sandbox checks, 54 application tests, TypeScript and production build passed October 25.
- [x] User confirmed both public steps; completed the testnet plan and independently verified finalized builds, ledger and recipient balances. Evidence: `evidence/business-testnet.json` and `evidence/business-testnet-observation.json`.
- [x] Review README judge steps and evidence classifications; document Rust prerequisites and track recommendations.
- [x] Obtain explicit confirmation to publish the reviewed repository.
- [x] Publish the reviewed repository before the deadline: [greyw0rks/greed-machine](https://github.com/greyw0rks/greed-machine), public `main`, initial public update `716c130`.
- [x] Prepare desktop/mobile screenshots and a single-post demo draft. Refreshed the public rehearsal captures; four desktop/mobile checks passed with no page errors.
- [x] Builder reports the demo video exported on October 31. Do not repeat rendering.
- [x] Locate and check the final export; `docs/demo-assets/greed-machine-demo.mp4` is now the builder's October 28 concept film. Native audio, 1,800 video frames and 23 caption cues pass verification; seven scene samples visually reviewed.
- [x] Add MIT LICENSE and third-party font/software notices; document baseline/reused components in README.
- [x] Prepare the final source/demo revision for the already-authorized public repository, with a ready description and human handoff in `docs/YOUR_NEXT_STEPS.md`.
- [ ] Human publishes the X demo post, explicitly saying built at NEAR HACKATHON, including `@NEARProtocol` and `#NEARHackathon`, with the video attached; retain its public URL. A local-only demo requires video rather than screenshots alone.
- [ ] Human provides/confirms project name, lead name, contact email, exact team-size category and track selections.
- [ ] Human supplies their own mainnet NEAR prize-payout account; do not substitute a testnet proof account.
- [ ] Human approves the 20–2,000 character project description and the exact repository/demo URLs.
- [ ] Read the contact notice verbatim and obtain agreement: "I agree that the organizers may use these details to review our submission and contact us about this hackathon."
- [ ] Check whether this project already submitted, re-read live rules, validate the exact API fields, and generate one persistent requestId.
- [ ] Display the complete JSON and wait for explicit confirmation; submit only during the window. Keep the personal payload outside the repository.
- [ ] Preserve requestId on a network error/503 retry; stop on 403 or 409. A 201 response is the only submission-success confirmation.

The reviewable deployment and publication proposal is [testnet-plan.md](testnet-plan.md). Recommended tracks for the current mechanics: business, swarms, security, memecoins. The human chooses the actual submission tracks. A controlled test vault does not establish external cross-chain DeFi settlement.

Repository publication, X posting, public transaction signing, mainnet deployment/spending and submission are not authorized merely by checking a box in this file. The exact human approvals govern these actions.
