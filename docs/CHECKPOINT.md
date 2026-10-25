# Greed Machine checkpoint — October 25, 2026

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

## Next actions awaiting explicit confirmation

[docs/testnet-plan.md](testnet-plan.md) is the concrete public testnet and repository publication proposal. Root: `greed-biz-1584eb30.testnet`; required faucet setup balance: 8.2242 test NEAR. All child accounts, compiled hashes and exact token operations are listed there. The root was absent at the finalized readiness check; public business evidence does not yet exist.

Proposed repository: `https://github.com/greyw0rks/greed-machine`, branch `main`. GitHub authentication was verified for `greyw0rks`; a read-only repository lookup returned 404. There is no Git remote or public push yet. Local credentials, signed journals and databases are ignored and excluded from frontend traces. The reviewed 139-file source snapshot is saved locally; 54 relative links were checked, with no local credential matches in the staged source. Publication remains pending.

After the user confirms both actions:

1. Run `npm run business:deploy` using the existing ignored dedicated credentials. Do not regenerate the plan. If faucet funding is insufficient, retain the same root account and request testnet funding for it.
2. Run `npm run business:verify`. Require finalized code, ledger and actual holder balances to reconcile before claiming public completion.
3. Refresh demo screenshots with `npm run business:ui`, update completion records and publish the reviewed repository to the confirmed destination.
4. The human publishes their X demo post with screenshots/video and supplies its public URL.
5. Collect the human-confirmed project name, lead name, email, team-size category, tracks, mainnet prize account and description. Arc/Clerk emails and testnet accounts are not assumed to be submission fields.
6. Ask whether the team already submitted, read the contact notice verbatim and obtain agreement. Re-read live rules, validate every exact API field, generate and preserve one requestId, display the full payload and wait for explicit confirmation. Submit only during the open window. Keep personal payloads outside the repository.

See [submission-checklist.md](submission-checklist.md) and [demo-post-draft.md](demo-post-draft.md).

## Boundaries and recovery

gUSD is unbacked, launch/fee/vault returns are sponsor fixtures, the 65/35 split is illustrative, and the holder snapshot is operator-attested within an immutable roster. External DeFi integration, market fee routing and production economics remain unfinished. Model agents receive no keys.

Keep `.near/business-transactions.json` and its decision/snapshot files if public execution is interrupted. Preserve the exact request, original transaction bytes and hash; an unknown status stops the runner. Never replace an uncertain payment or create a new run ID to bypass it.

Tests and browser captures use temporary databases and local/mock providers. The normal demo database, earlier testnet evidence and scheduler state were not changed by this work. The scheduler remains disabled. No public business signing, mainnet action, repository push, X post or submission occurred.
