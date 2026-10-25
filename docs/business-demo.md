# NEAR business-cycle demonstration

This rehearsal exercises actual NEP-141 token transfers between compiled contracts. The assets are test fixtures: gUSD is unbacked and is not USDC; a separate GREED fixture has a fixed million-token supply. A sponsor seeds the controlled vault's returns. There is no external DeFi yield, launchpad sale or routed market fee in this demonstration.

The existing public simulation and earlier NEAR policy/token proofs are preserved. This module uses separate accounts and evidence. Models never receive signing credentials.

## Judge walkthrough

1. Run `npm ci`, `npm run business:build`, then `npm run business:check`. See compiled NEAR Sandbox checks and `evidence/business-sandbox.json`.
2. Run `npm run build` and `npm start`. Open http://localhost:3014/testnet. See the money-cycle ledger, the recorded decision, frozen holder payments and contract verification checks.
3. If a public testnet rehearsal has been completed, click **Verify on NEAR testnet**. See a fresh finalized block, all four pinned contract builds and the treasury's actual token balance reconciled with its ledger. Follow the public transaction links. A Sandbox-only report is explicitly labelled and cannot use this public verification action.
4. Inspect the failed receiver check. See that an unsuccessful payment retains its liability; sponsored NEP-145 registration enables retry of the same entitlement. A paid entitlement rejects replay.
5. Inspect the GREED snapshot. Genesis mint and transfer receipts reconstruct the complete supply; pinned historical balance views confirm every weight. A transfer after the period freezes leaves its entitlements unchanged.

## The bounded cycle

| Operation | Demo amount | Accounting |
| --- | --- | --- |
| Launch fixture funding | 1,000 gUSD | Principal; excluded from profit |
| Project-fee fixture funding | 5 gUSD | Realized revenue from a labelled sponsor transfer |
| Operating invoice | 2 gUSD | Expense to the immutable expense receiver |
| Reviewed vault allocation | 100 gUSD | Reserved principal; maximum capital per action |
| Vault exit | 110 gUSD | 100 principal returned plus 10 sponsor-funded fixture result |
| Realized net result | 13 gUSD | 5 + 10 − 2 |
| Holder liabilities | 8.45 gUSD | Illustrative 65% of distributable net result |
| Retained share | 4.55 gUSD | Illustrative 35% retained |
| Final liquid treasury | 1,004.55 gUSD | Principal + net result − verified payouts |

The fixed liquid reserve is 25% of launch principal. The operating expense budget is 10 gUSD per closed distribution period. Demonstration distribution cadence is 60 seconds; production economics and cadence remain unset. NEAR gas expenditure is recorded separately in yoctoNEAR and is not silently converted into a gUSD expense.

## Authority and evidence

`contracts/business` authorizes only a separate operator account. Its worker key has a receiver- and method-restricted NEAR access permission, a bounded gas allowance and no NEAR transfer/deployment permission. The guardian can pause new commitments, expenses and payouts; it cannot redirect money. Existing positions may exit during a pause.

The treasury fixes the token, vault, expense receiver and eligible recipient roster at initialization. It enforces fresh proposal timestamps, expiry, a 100 gUSD capital cap, reserves, unpaid liabilities and unique operation IDs. Income and expenses require unique receipt references. Expenses record an evidence commitment and become charged only after a successful token transfer callback. The invoice used by the rehearsal is explicitly a fixture.

Periods freeze their complete holder list, weights, snapshot hash and exact integer allocation. The proof script reconstructs the holder snapshot from the rehearsal's full token event history and checks it against pinned NEP-141 views. This is bounded demonstration indexing, not a production indexer for arbitrary historical token contracts. The contract accepts an operator-attested snapshot within its immutable roster; it does not independently verify historical token balances or accept a trustless indexing proof.

Outgoing operations are stored before dispatch. A payout has PENDING/FAILED → SENDING → PAID transitions. A definite token-transfer failure retains its entitlement. An ambiguous or malformed cross-contract outcome remains unresolved and cannot trigger another payment. Automatic retries have a fixed attempt cap. There is no privileged method to mark a payment successful without its token callback.

## Transaction recovery

`src/lib/business/journal.ts` saves the exact signed bytes, hash, operation fingerprint and status before dispatch. An interrupted send retains the original transaction. Resuming checks its finalized status by the same hash; a changed request is rejected. Unknown transactions stop the rehearsal rather than creating a replacement, new run ID or nonce. Keep the journal, decision and snapshot files to resume a partially completed cycle.

If the process ended before broadcasting a prepared transaction, first establish that status. The current runner deliberately stops when the original hash cannot be verified; it has no automatic re-signing or rebroadcast action. A contract UNCERTAIN/SENDING state likewise needs receipt investigation, rather than an assumed refund.

Ignored `.near/business-credentials.json` contains only dedicated testnet credentials, mode 0600. `.near/business-transactions.json` contains signed payloads and remains private. Neither belongs in a repository, public API, browser or submission payload. The deployed contract accounts retain separate setup keys; this is a bounded testnet proof, not an audited immutable production treasury.

## Public testnet rehearsal

After local contract checks pass:

```sh
npm run business:plan
npm run business:deploy
npm run business:verify
```

`business:plan` generates a dedicated testnet account plan and prints public accounts, compiled build hashes, required test NEAR and exact token amounts. It performs no network mutation. The current reviewable plan is [testnet-plan.md](testnet-plan.md). The human must explicitly confirm the plan before public signing, as required by [HACKATHON.md](HACKATHON.md).

`business:deploy` checks a synced testnet RPC, uses the testnet faucet for the dedicated setup account, creates isolated child accounts and installs the restricted operator key. It refuses another contract build or an existing child without matching creation evidence. All subsequent actions are journaled. It writes `evidence/business-testnet.json` only after the complete cycle and independent final balances pass. Earlier evidence files are not overwritten.

`business:verify` reads the completed public proof and refreshes finalized code and ledger observations without signing. Public frontend deployment and repository publication are separate actions requiring the human's explicit confirmation. A demonstration token is not the required mainnet prize-payout account.
