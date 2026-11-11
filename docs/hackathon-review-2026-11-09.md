# Greed Machine: NEAR Hackathon review

Reviewed November 9, 2026, Africa/Lagos, against the supplied hackathon page and the current [official HACKATHON.md](https://nearhackathon.com/HACKATHON.md). Public repository reviewed: [greyw0rks/greed-machine](https://github.com/greyw0rks/greed-machine), `main` at `30cf44d855edbe6dfbfa045cec397236bca53b2f`.

**Verdict:** Greed Machine is a credible working prototype, with its strongest case in Autonomous Business, Memecoins With Mechanics, and AI Security & Defense. Its distinctive achievement is a treasury that accounts for costs, losses, reserves and failed holder payments. The demonstrated NEAR payments are real test-token transfers. The investment returns and fee revenue are funded fixtures, so the evidence does not yet establish a profitable autonomous business.

## Submission status: already listed

The live [project directory search](https://nearhackathon.com/api/projects?q=Greed&page=1) returns one Greed Machine entry, ID `4e50d9a7-3ef3-4a68-9307-01d46c96e184`, with these tracks:

`defi`, `business`, `swarms`, `security`, `agents`, `memecoins`.

Its demo URL is [the November 2 X post](https://x.com/Greyw0rks/status/2117323746600161676). This public listing supersedes the November 2 “unsubmitted” statements in [submission-checklist.md](submission-checklist.md) and [YOUR_NEXT_STEPS.md](YOUR_NEXT_STEPS.md). The directory does not expose the private submission description or payout wallet; neither was verified here.

Do not submit the project again. If the existing entry needs a different demo link or tracks, the organizers provide [Request changes](https://nearhackathon.com/request-changes). A request is reviewed manually, and the saved entry stays unchanged until the organizers apply it.

## Findings, in priority order

### 1. The submitted videos explain the concept but do not demonstrate the working prototype

The directory links a 36.05-second bot animation, “Little bots. Big ambition.” Its [thread reply](https://x.com/Greyw0rks/status/2117323752161595785) contains a 60.05-second concept film. Both videos were downloaded from public X media, probed and visually inspected at regular intervals. Neither shows an operator action, a refusal in the actual app, a payment retry, or a live NEAR verification result.

The current rules ask for one complete moment from user action to visible result. A concept animation can explain the idea, but it leaves the strongest implementation evidence off-screen. Replace or supplement the entry's primary demo with a short actual-app walkthrough. Use the existing completed testnet proof; no new payment or deployment is needed to demonstrate verification.

The primary post includes `@NEARProtocol` and `#NEARHackathon`, but its text does not explicitly say the project was **built at NEAR HACKATHON**, as the current instructions request. The reply says “Built on NEAR,” which also does not explicitly identify the event. Include the requested event statement in the walkthrough post. If its URL changes, request an update to the existing submission.

### 2. Judges cannot discover the run instructions from the README

The public [README](../README.md) clearly explains the product and honestly describes today's limitations. It has no link to setup, a judge walkthrough, testnet evidence or attribution. The instructions exist in [business-demo.md](business-demo.md) and [demo-runbook.md](demo-runbook.md), but a judge starting at the repository front page must find them independently. Q-012 specifically requires reproducibility for local-only demos.

Keep the requested simple product README. A short plain-language link to “Try the working prototype” can lead to a separate judge guide; setup commands do not need to return to the README. That guide should provide Node prerequisites, dependency installation, an app-only path that needs no Rust or credentials, and an optional Rust/Sandbox path. The current business walkthrough starts with contract compilation, adding unnecessary setup before a judge can see the already-published proof.

The checkpoint also still says development-scope links are in README; that is no longer true after the simplified README was published. Update that claim when preparing the guide.

### 3. The business proposition is ahead of the economic evidence

The [business model](business-model.md) specifies buy, hold and automatic stablecoin profit sharing. The completed rehearsal proves a bounded money cycle: sponsor funding, an expense, a controlled vault and test-token payouts. Its decision is explicitly a [deterministic fixture](../src/lib/business/decision.ts), and the scheduled simulation worker is separate from the onchain rehearsal.

There is no demonstrated launchpad fee route, externally earned customer revenue, live market strategy, or continuously operating model-to-onchain execution loop. Buying or selling GREED does not itself create project income; the current token has no trading-fee mechanism. The exact venue, fee routing, split, stablecoin, cadence and holder eligibility remain unsettled.

For this submission, state precisely what works: **an inspectable agent-treasury prototype with NEAR-enforced limits and receipt-backed test-token payouts**. A competitive Autonomous Business case would be stronger with one genuine source of earned income and the complete path from that income to net profit and holder entitlements. Such evidence is currently absent. Mainnet is not required for eligibility, and fixture results should not be presented as market performance.

### 4. Several submitted tracks have much weaker evidence

Multiple tracks are allowed; the count itself is not a violation. However, a mock vault and agent dialogue do not establish all six submitted propositions. The strongest story is the business's treasury mechanism and enforceable limits. The additional tracks need their own demonstrated behavior.

| Track | Current fit | Evidence and practical limit |
| --- | --- | --- |
| Autonomous Business | Strongest product fit | Treasury lifecycle and revenue sharing; external earnings and continuous onchain autonomy remain unproven. |
| Memecoins With Mechanics | Strong | GREED-associated treasury and exact holder allocations; launch, fee routing and production distribution are unfinished. |
| AI Security & Defense | Strong implementation fit | Spending limits, restricted worker key, reserve/liability protection, guardian pause, refusal and replay handling. |
| AI Swarms | Secondary | Competing scouts and adversarial review work; no coordination market, paid bidding, collective purchase or independent agent economy is demonstrated. |
| Unstoppable DeFi | Weak today | A controlled testnet vault exists; no live market/lending integration, liquidity evidence or cross-chain settlement is demonstrated. |
| Agent Economy | Weak today | Provider usage and costs are accounted for; no agent earns crypto, hires another agent or completes a crypto-paid external service purchase. |
| Investment Thesis | No current fit | No evidence-based long-term NEAR investment thesis. |
| Privacy & Private AI | No current fit | No confidential execution or attestation proof. |
| Real-World Money | No current fit | Holder test-token payouts do not establish payroll, invoicing or merchant rails for an operating company. |
| Games With Real Economies | No current fit | Bot visuals provide no playable economy. |
| NFTs That Do Something | No current fit | No behavioral NFT account implementation. |
| Social Money | Limited thematic overlap | Shared money exists, but no demonstrated community workflow of the kind this track describes. |
| Open Innovation | Possible, unnecessary | The project already has specific, clearer track homes. |

Recommendation: lead the pitch with `business`, `memecoins` and `security`. Treat `swarms` as secondary. Track changes are optional; focus first on making the existing prototype observable. NEAR Intents, Chain Signatures and ecosystem partners are hints, not mandatory integrations under Q-011.

### 5. The security guarantee has important, disclosed boundaries

The restricted worker key limits its receiver and methods, and the [business contract](../contracts/business/src/lib.rs) enforces spending and payout rules. That is substantive security evidence. It is not a guarantee against the retained full-access setup keys, which can change deployed contracts. Code-hash verification detects a changed build when checked; it does not prevent an administrator from changing it.

Holder snapshots are reconstructed and checked by the proof runner, then attested by the operator. The contract checks membership in an immutable roster and bounded weights, rather than independently verifying historical GREED balances. It permits at most eight roster members and 100 periods. This is a deliberately bounded rehearsal, not a production distribution indexer. The UI and [business demo](business-demo.md) disclose these boundaries; keep them in the submission's claims.

## Likely judging strengths and weaknesses

The site names technical implementation, design, impact, originality and sustainability as a guide from previous NEAR hackathons. These are qualitative assessments, not an official score or a prediction of placement.

| Dimension | Assessment |
| --- | --- |
| Technical implementation | Strong prototype: durable accounting, refusal paths, provider-failure recovery and verified test-token transfers. The separate simulation and onchain rehearsal leave continuous autonomous execution unproven. |
| Design | Strong: coherent typography, readable public records, clear scope labels and working desktop/mobile flows. The primary submitted video does not let judges see those flows. |
| Impact | Plausible problem: holders need to inspect where treasury money goes. Independent adoption, user feedback and externally earned revenue were not established. |
| Originality | The complete path through costs, loss recovery and failed-recipient liabilities is more distinctive than agent dialogue alone. Explain that mechanic explicitly; the supplied project list already contains several agent spending guards. |
| Sustainability | Unproven: provider costs are tracked, but the actual launch/fee venue, recurring earnings, acquisition costs and payout economics remain undecided. |

## What was verified

| Check | Result |
| --- | --- |
| Public repository and license | Public, MIT; GitHub reported `main` at `30cf44d`. |
| Public/local implementation comparison | All 105 source, test, script, contract and configuration blobs checked match GitHub. |
| Application suite | **54/54 passed**, no failures or skips. Temporary databases and mocked providers. |
| TypeScript | Passed. |
| Production build | Passed with installed dependencies, Node `v22.23.4`. |
| Foundation browser flow | Passed: complete cycle, loss recovery, payout retries, uncertain-provider-cost reconciliation and no automatic paid replay; **18 captures**, desktop/mobile, no page errors. |
| Business proof browser | Passed: proof rendering and navigation at 1440px/390px; **4 checks**, no page errors. |
| Fresh public NEAR observation | Reconciled at finalized block **276840299**, observed **2026-11-08T23:08:16.290Z** (November 9 in Lagos). All four recorded contract code hashes matched. |
| Current recipient balances | Alice **1.2675**, Bob **4.225**, Carol **2.9575 gUSD**; total **8.45 gUSD**. |
| Submitted X material | Public main post and reply confirmed; H.264/AAC videos of approximately 36s and 60s. Both are concept material. |

The live ledger still reconciles:

`1,000 principal + 5 fee fixture + 10 vault-return fixture − 2 expense − 8.45 holder payouts = 1,004.55 gUSD treasury`.

Unpaid liabilities and capital still reserved are zero. The 65/35 split is illustrative. gUSD is unbacked, and the vault return and project-fee income are sponsor-funded fixtures. The three recipient accounts are rehearsal accounts, not evidence of independent customer adoption.

The saved 25-check compiled Sandbox report was inspected but not rerun. A clean dependency installation, clean Rust build, full smart-contract audit, deployed setup-key audit and private submission payload were outside this review. Browser evidence was written to `/tmp/greed-hackathon-review-tla9Yx/`; earlier NEAR evidence and the normal demo database were preserved. No transactions were signed, no payments replayed, no scheduled worker enabled on the normal ledger, and no public post or submission changed.

## Best remaining work before judging

1. Correct the local submission-status handoff so future work does not attempt another submission.
2. Make the judge's app-only setup and proof path discoverable with one simple README link.
3. Record an actual-app walkthrough: run a simulation cycle, show a refused unsafe action, inspect a frozen entitlement, show failure/retry, then open **NEAR proof**, verify fresh finalized balances and follow a transaction link. Label the simulation and test-token sections visibly.
4. Include “built at NEAR HACKATHON,” `@NEARProtocol` and `#NEARHackathon` in the walkthrough post. Request an update to the saved demo URL if needed.
5. Tighten the description around implemented treasury mechanics and limits. Treat real business revenue, live DeFi execution and USDC payouts as future work.

The deadline remains **November 14, 2026, 23:59 UTC / November 15, 00:59 Africa/Lagos**. Work since the October 19 announcement counts; the repository's October 25–November 2 commits fall within that window. Testnet-only projects and local-only demos are allowed. Reproducibility, a clear working demo and precise claims are the most useful improvements to this entry now. The actual private description is unavailable, so no assumption is made that it currently overclaims.

## Walkthrough post draft

Use this only after the attached actual-app walkthrough demonstrates the stated actions. It is a draft, not a published post or an organizer change request.

> AI treasury decisions should be inspectable.
>
> Greed Machine, built at NEAR HACKATHON: watch a proposal pass limits, a failed payout recover, and NEAR test-token balances reconcile.
>
> @NEARProtocol #NEARHackathon
> https://github.com/greyw0rks/greed-machine
