# Milestones

The October 25 business-model clarification supersedes the earlier governance-first roadmap. Holders buy and hold; routine treasury operations are autonomous, with votes only for core changes. Funding comes from launch proceeds and project trading fees; profit payouts use a stablecoin such as USDC. See [business model](business-model.md).

## Completed: simulation core

Competing agents, eight deterministic policy checks, integer accounting, persistent audit records, a six-scenario benchmark, and snapshot-weighted demo governance with a timelock.

## Completed: NEAR policy proof — October 25, 2026

- Rust contract on [greed-policy-8a07c217.testnet](https://testnet.nearblocks.io/address/greed-policy-8a07c217.testnet).
- Accepted, unauthorized-receiver, and replay decisions recorded and read back from finalized blocks.
- Isolated operator and guardian; immutable mandate bounds, input commitments, and bounded storage.
- Overview verifies the deployed build hash and displays and exports the stored decision.
- Evidence: [public testnet records](../evidence/near-testnet.json), [local contract checks](../evidence/near-sandbox.json), [reproduction guide](near-policy-proof.md).
- Validation: 22 application tests, 16 compiled-contract checks in NEAR Sandbox, TypeScript, production build, desktop/mobile browser checks, and zero npm audit findings.

The proof uses synthetic inputs and a fixed reference principal. Treasury settlement and holder governance remain simulated. Testnet gas came from a dedicated faucet-funded account.

## Completed: wallet-authenticated governance — October 25, 2026

- Browser-bound, expiring NEP-413 challenges, full-access key verification, hashed sessions, sign-out and mutation-time key rechecks.
- Pinned NEP-141 contract snapshots, one ballot per account, raw token quantities and exact quorum arithmetic.
- Five-minute wallet votes and one-minute timelocks; demo identities remain separate.
- Desktop/mobile wallet selector, snapshot evidence export and sign-out.
- Validation: 29 application tests, five compiled-token checks, TypeScript, production build, desktop/mobile wallet flows, all 12 existing route captures, and zero production dependency audit findings.
- Compiled token verification in NEAR Sandbox proves transfers after a snapshot do not change voting weight.
- Public token deployed to `token.greed-policy-8a07c217.testnet`; `elchapi.testnet` received 650,000 of 1,000,000 demo units. Code, supply and allocations verified at a finalized block.
- Reproduction and limits: [wallet governance](wallet-governance.md), [compiled-token evidence](../evidence/governance-sandbox.json).

The app is configured with the public testnet token and pinned code hash. Local browser verification uses an injected wallet with real signatures; public supply and allocations are read from finalized testnet state. The user signs in with their own wallet. Wallet mandates currently change the simulated treasury only.

## Completed: autonomous simulation foundation — October 25, 2026

- Public activity, swarm debate, security, distributions and audit pages require no wallet connection. Operator controls and core-governance information have separate routes.
- An independent worker persists scouting, debate, independent security, bounded funding and settlement phases. Public reads do not advance the business clock.
- Integer settlement separates returned principal, costs and realized net result. A portfolio high-water mark carries losses forward before allocating new profit.
- Immutable fixture snapshots allocate the illustrative 65/35 split with deterministic largest-remainder rounding. Unpaid liabilities and a fixed liquid reserve remain protected.
- Funding rechecks expiry, pause, prior execution IDs and reserve solvency including known costs. Unavailable recipients keep their entitlement; fair retries prevent failed batches from starving later holders.
- Validation: 37 application tests, TypeScript and a production build. The isolated browser check passed all 16 desktop/mobile route captures with zero page errors, including reduced-motion hydration, failed receiver retries, loss recovery and audit export. Fresh-process tests cover worker environment loading, funded positions, expired leases and unpaid payouts.
- Reduced-motion preferences use a consistent server/hydration snapshot before subscribing to browser changes, keeping the 3D controls and page transitions free of hydration mismatches.

All positions, recipients and payout receipts are synthetic. The existing NEAR proofs remain separate; they do not authorize this foundation.

## Completed: provider accounting and worker recovery — October 25, 2026

- Each provider request is journaled before dispatch. Valid usage is charged before answer validation, and settlement includes that expense exactly once.
- Failed model phases retain known charges and pause operations. Missing usage, timeouts and interrupted calls block funding and payouts until an operator records confirmed cost and supporting evidence.
- Parallel calls finish accounting before a failure propagates. Recovery closes unfinished phases without automatically resending paid requests.
- Workers renew their five-minute lease every fifteen seconds and around provider calls. Stale workers may record late financial evidence but cannot commit a phase; conflicting invoices reopen reconciliation.
- Validation: 48 application tests, TypeScript and a production build. The production browser report passed 18 desktop/mobile captures with zero page errors, including provider recovery, invoice reconciliation, duplicate rejection and audit export.

Provider invoice lookup remains manual. Model analysis does not turn the synthetic strategy or payout adapters into real transactions.

## Completed locally: compiled NEAR business rehearsal — October 25, 2026

- Separate treasury, controlled vault and NEP-141 demo-token contracts settle actual token transfers in an isolated NEAR Sandbox.
- Unique launch/fee fixture records and operating invoices keep principal, realized net result and expenses separate. A fixed reserve, capital ceiling, expense budget and guardian pause gate spending.
- A method- and receiver-restricted operator key executes the reviewed fixture action. Returned principal and sponsor-funded fixture result reconcile with real token balances.
- A 60-second cadence freezes receipt-reconstructed GREED weights and exact holder entitlements. Failed receivers retain liabilities; sponsored registration enables retry without paying an entitlement twice.
- The signed-transaction journal recovers an ambiguous broadcast by its original hash. A changed request cannot reuse the saved step.
- Validation: 54 application tests, TypeScript, production build and 25 compiled Sandbox checks. The final ledger contains 1,004.55 gUSD, with 8.45 gUSD successfully paid and zero unpaid liabilities.
- Evidence: [compiled rehearsal](../evidence/business-sandbox.json), [reproduction guide](business-demo.md), and [completed public testnet plan](testnet-plan.md).

gUSD is unbacked, the vault result is sponsor-funded, and the snapshot is operator-attested within an immutable roster. This separate rehearsal is not the simulation foundation's production adapter. Public business deployment and initial repository publication were subsequently completed, as recorded below.

## Current: improve the existing hackathon entry

Greed Machine is already submitted as entry `4e50d9a7-3ef3-4a68-9307-01d46c96e184`. The November 9 directory check supersedes the older unsubmitted handoff. Do not submit again.

The November 10 package adds an app-only judge guide, simple README links, corrected description and post copy, plus the 80-second actual-app walkthrough and editable source. Encoded-file verification and the recorded HyperFrames checks pass. Human listening remains before posting.

1. Listen to the [walkthrough](demo-assets/greed-machine-walkthrough.mp4), then publish the prepared X post with “built at NEAR HACKATHON,” `@NEARProtocol` and `#NEARHackathon`.
2. To replace the saved concept-demo URL, use [Request changes](https://nearhackathon.com/request-changes) for the existing entry. The [draft correction](entry-change-request.md) includes optional description and track changes.
3. Save the request confirmation and verify that organizers applied it. Follow [the checklist](submission-checklist.md); original private fields and consent must not be inferred.

## Beyond the hackathon demonstration

1. Specify launchpad/DEX fee routing, treasury launch allocation, exact holder split within 60–70%, treatment of fee revenue, payout cadence, eligibility and loss-recovery/reserve rules.
2. Connect production launch and trading-fee receipts and build scalable holder indexing under the chosen eligibility rules. The completed rehearsal already demonstrates fixture funding categories, a fixed cadence and a bounded, reconstructable roster.
3. Add period-level operating expense and distribution cost budgets; integrate automatic provider invoice lookup when a provider supports it.
4. Replace the controlled fixture vault with a verified external DeFi adapter, finalized position reconciliation and the selected stablecoin instance.
5. Add the selected launchpad purchase destination and reuse wallet governance only for core-policy changes.

The earlier next step of prioritizing on-chain governance updates is deferred. Existing contracts, wallet verification and tests remain useful foundations. External DeFi trades, routed launch/trading-fee income and production stablecoin profit payouts remain unfinished.

## Completed: public business settlement — October 25, 2026

The confirmed plan executed on public NEAR testnet. Eleven rehearsal checks and an independent finalized code/ledger/balance observation pass: 1,004.55 gUSD cash, 8.45 gUSD holder payments and zero unpaid liabilities. Carol retained her entitlement after a failed transfer and received 2.9575 gUSD on retry. The original guardian pause was recovered under its original hash after funding native gas from the setup buffer; no replacement signature, payment or run ID was created. Evidence: [public rehearsal](../evidence/business-testnet.json), [finalized observation](../evidence/business-testnet-observation.json). Unbacked tokens and controlled returns remain fixtures.
