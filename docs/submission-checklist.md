# NEAR HACKATHON submission preparation

Rules source: [live HACKATHON.md](https://nearhackathon.com/HACKATHON.md), fetched November 2, 2026 and saved [locally](HACKATHON.md). Re-read the live version immediately before submission.

Development eligibility begins with the October 19 announcement. Submissions are open November 1 at 00:00 UTC through November 14 at 23:59 UTC; the deadline is November 15 at 00:59 Africa/Lagos. There is one submission per repository/project. One person may enter at most two independent projects, with mutual README disclosures. The builder confirmed November 2 that Greed Machine is unsubmitted and is their only NEAR entry.

- [x] Complete the compiled business rehearsal: 25 saved Sandbox checks; 54 application tests, TypeScript and production build passed.
- [x] Complete the approved public rehearsal and independently verify finalized builds, ledger and recipient balances. Preserve `evidence/business-testnet.json` and `evidence/business-testnet-observation.json`; do not repeat payments.
- [x] Publish the approved public repository: [greyw0rks/greed-machine](https://github.com/greyw0rks/greed-machine). The initial implementation is `26e4316`; public evidence and palette are in `716c130`.
- [x] Prepare judge instructions, development-scope links, MIT license, attribution, screenshots, [post draft](demo-post-draft.md) and [description](submission-description.md).
- [x] Re-read the current rules and record the builder's unsubmitted/single-entry confirmation.
- [ ] Builder renders and exports the current 80-second app/testnet walkthrough and selected 60-second concept film. Complete caption and human playback review. Earlier video files are not evidence of the new exports.
- [ ] Human publishes the X demo post with a reviewed video attached, “built at NEAR HACKATHON,” `@NEARProtocol` and `#NEARHackathon`; retain its public URL. Screenshots alone do not satisfy the local-only demo requirement.
- [ ] Human confirms project name, lead name, contact email, exact team-size category (`1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+`) and chosen track IDs.
- [ ] Human supplies their own mainnet NEAR prize account; do not substitute a testnet proof account.
- [ ] Human approves the 20–2,000 character description and exact public repository/demo URLs.
- [ ] Read the contact notice verbatim and obtain agreement: "I agree that the organizers may use these details to review our submission and contact us about this hackathon."
- [ ] Confirm that this project is still unsubmitted and re-read live rules immediately before sending.
- [ ] For the API, validate exactly the fields below, generate one persistent requestId, display the complete JSON and obtain explicit confirmation. Keep the personal payload outside the repository.
- [ ] Submit once during the open window and preserve the confirmation. Only HTTP 201 confirms API success.

## API field contract

Use exactly `requestId`, `projectName`, `leadName`, `email`, `size`, `tracks`, `nearAddress`, `projectUrl`, `demoUrl`, `idea`, `consent`. Do not add fields. Validate against [the current contract](HACKATHON.md#submission-api), including the 12,000-byte body limit, UUID, field lengths, unique track IDs, valid email and lowercase mainnet account. Never use placeholders for human fields or infer consent.

On a network error or 503, retain the exact payload and requestId for a retry. On 400, fix the identified validation fields with the same requestId. Stop on 403 or 409; a 409 means the repository was already submitted or the email reached its two-entry limit. Do not change the repository or email to bypass it.

Recommended tracks: `business`, `swarms`, `security`, `memecoins`. The human chooses the final tracks. NEAR Intents and external cross-chain DeFi are not integrated. The public rehearsal's gUSD is unbacked and returns are sponsor-funded fixtures.

Repository publication was already approved; X posting and submission still require their specific human steps. No mainnet spending is authorized.
