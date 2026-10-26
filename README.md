# Greed Machine

Greed Machine is an autonomous treasury business in development. Holders buy GREED and hold it; competing agents discover and debate opportunities, independent security and deterministic rules gate capital, and realized net profit supports stablecoin payouts and treasury growth. Governance is reserved for core changes.

The problem is keeping a token-funded business accountable while agents run its routine operations. This prototype makes each proposal, spending limit, operating expense and holder entitlement inspectable. NEAR contracts enforce the bounded rehearsal's spending rules and settle its demo-token transfers; an operator key can call only the approved treasury methods.

The public foundation uses synthetic USDC, market fixtures and fixture recipients. A separate NEAR business rehearsal implements token funding, expenses, capped vault execution, receipt-reconstructed GREED snapshots and test-token payments. Its gUSD is unbacked, returns are sponsor-funded fixtures, and its 65/35 split is illustrative. Production launchpad/fee routing, arbitrary holder indexing and market strategies remain unfinished. See [business model](docs/business-model.md), [NEAR business demo](docs/business-demo.md) and [milestones](docs/milestones.md).

## Judge walkthrough

1. Follow the local setup below, then open http://localhost:3014/app. Start a scenario in Operator and advance its phases. See competing proposals, independent security, settlement and protected simulated distributions.
2. Run `npm run business:build` and `npm run business:check`. Open http://localhost:3014/testnet. See the compiled NEAR money-cycle evidence: principal, fee fixture, operating expense, vault exit and holder payments. The page labels local Sandbox evidence separately from public testnet evidence.
3. Inspect [the completed public testnet rehearsal](evidence/business-testnet.json) and [business demo](docs/business-demo.md). On `/testnet`, click **Verify on NEAR testnet**: see pinned contract builds, a 1,004.55 gUSD treasury, 8.45 gUSD paid to holders and zero unpaid liabilities at one fresh finalized block. Alice received 1.2675 gUSD, Bob 4.225 gUSD and Carol 2.9575 gUSD after registration and retry. The finalized observation is saved [here](evidence/business-testnet-observation.json).
4. Inspect the older [policy](evidence/near-testnet.json) and [wallet/token](evidence/governance-testnet.json) proofs. They are preserved separately and do not substitute for business settlement receipts.

The hackathon rules and human publication/submission steps are tracked in [the submission checklist](docs/submission-checklist.md). No mainnet product launch or profit claim is implied by these test fixtures.

Track recommendations, pending the team's choice: **business** for treasury operations and revenue sharing; **swarms** for competing agent proposals and debate; **security** for deterministic spending limits and restricted function-call keys; **memecoins** for rule-governed GREED holder distributions. NEAR Intents and external cross-chain settlement are not integrated.

## What works

- Public landing page and activity, swarm, security, distributions and audit records without wallet sign-in
- Separate simulation operator controls and core-governance information
- Worker-driven scouting → debate → security → funding → settlement
- Deterministic simulation agents and optional provider-backed analysis
- Funding-time allowlist, exposure, expiry, replay, pause and reserve checks
- Independent integer settlement, loss recovery and protected unpaid holder liabilities
- Frozen fixture snapshots, exact rounding and fair, idempotent payout retries
- Persisted phases, worker leases and recovery across fresh processes
- Per-call provider cost records, automatic pause on unknown costs and documented operator reconciliation
- Hash-linked audit records and downloadable simulation evidence
- Preserved NEAR testnet policy/token contracts and wallet-authentication modules
- Separate compiled NEAR treasury, controlled vault and event-emitting demo tokens
- Unique funding/invoice records, fixed reserves and frozen test-token holder payments
- Exact signed-transaction journal, restricted operator key and failed-receiver recovery

## Run locally

Use Node.js 22.22.2 or newer and npm 10 or newer. SQLite is built into Node.

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open [http://localhost:3014](http://localhost:3014). Public pages read persisted records. Visit [Operator](http://localhost:3014/app/operator) to run one simulation cycle and advance its phases, or start the scheduled worker in another terminal:

```bash
npm run foundation:worker -- --enable
```

The worker loads Next.js environment files, including `.env.local`, before opening the database; explicit process environment overrides take precedence. It uses the same `GREED_DB_PATH` as the web app. Stop it with Ctrl+C; completed phases and unpaid entitlements remain in SQLite. `npm run foundation:tick` advances one phase and processes a payout batch. `npm run foundation:seed` adds four fixture scenarios once to a fresh foundation.

Set `FOUNDATION_OPERATOR_TOKEN` for operator actions outside localhost, and enter it in the Operator page. Paid model mode through the web requires that token. Keep credentials in ignored `.env.local`; public records contain no operator token.

## Verification

```bash
npm run verify
npm run check:foundation
```

`verify` runs TypeScript, application tests and the production build. Tests cover policy, accounting, auth, governance, distribution rounding, loss recovery, fixed reserves, replay rejection, fair payout batches, worker environment loading, provider failure accounting, holder reconstruction and restart recovery. `business:check` separately executes the compiled contracts in NEAR Sandbox. It uses fresh isolated accounts and keeps signed journals under a temporary directory.

The compiled checks require Rust 1.93 or newer, Cargo and the `wasm32-unknown-unknown` target:

```bash
rustup target add wasm32-unknown-unknown
npm run business:build
npm run business:check
npm run business:ui
```

`business:ui` requires the production build and Playwright Chromium. It captures the proof page on an isolated server and writes reviewed demo media to [docs/demo-assets](docs/demo-assets/README.md). No public testnet signature is needed to reproduce the local Sandbox cycle.

`check:foundation` starts its own production server on port 3114, a local fixture provider and a temporary SQLite database. It exercises operator actions, public reads, payout retries, loss periods, unknown provider costs, invoice reconciliation, duplicate rejection, audit export and refresh recovery. It captures all eight routes at desktop/mobile sizes plus two mobile recovery states. It never calls a paid provider. A Playwright Chromium installation is required; set `CHROMIUM_PATH` if using a custom binary. `GREED_FOUNDATION_CHECK_PORT` overrides its port. Evidence is written to `.impeccable/review/foundation-browser-results.json`. `check:ui` invokes the same check.

The build uses Next.js's supported `--webpack` fallback for this environment.

## Optional model analysis

Configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` and current input/output prices in `.env.local`; select model mode in Operator. Model calls analyze synthetic scenarios and never receive signing keys. Valid provider usage is required for cost accounting.

Each foundation request is recorded before dispatch. Valid token usage is booked immediately at the configured prices, before answer validation; failed answers retain their cost. Settlement includes these costs without debiting them twice. Model-phase failures pause operations so a scheduler cannot keep buying failed analysis. Known costs need only review and explicit resume; unknown costs require reconciliation first. Workers renew their five-minute lease every fifteen seconds and before provider calls. A worker that loses its lease cannot commit a phase.

Timeouts, missing usage and interrupted requests retain uncertain records. New capital commitments and payouts stay blocked until their cost is reconciled. In Operator, use **Check worker recovery** after a crash, then enter the provider-confirmed cost in USD and supporting invoice/usage evidence. A zero amount requires evidence of no charge. Completed reconciliations cannot be applied twice; a conflicting late usage response reopens the discrepancy. Resume operations explicitly after every outstanding call is resolved.

Unknown invoices require operator evidence; the app has no automatic provider invoice integration. A bill beyond available synthetic cash remains visible and blocks accounting. Provider recovery applies to the current foundation; the preserved historical `/api/machine` model path is not its financial operating loop. Strategies and payout receipts remain synthetic even when analysis uses real model calls.

## Preserved NEAR evidence

The earlier prototype deployed a policy proof and a demo token on NEAR testnet. The token allocated 650,000 demo GREED to `elchapi.testnet`; it is not production tokenomics. Existing wallet-authentication and governance modules remain available for later core-rule integration, but the foundation's governance page is informational.

- [Policy proof](docs/near-policy-proof.md), reproduced with `contract:build`, `contract:check`, `near:plan` and `near:verify`
- [Wallet/token proof](docs/wallet-governance.md), including finalized token evidence and compiled-token checks
- [Public policy records](evidence/near-testnet.json) and [public token records](evidence/governance-testnet.json)

The policy contract cannot transfer treasury assets. `GET /api/near` remains a read-only finalized-block verification endpoint. Earlier connected-workspace instructions in the proof guides describe the historical prototype; those controls are not part of the current public foundation.

## Project map

- `src/lib/foundation/` — worker state, debate/security, profit allocations and payout receipts
- `src/components/foundation/` — current public site and operator interface
- `src/app/api/foundation/route.ts` — public read and protected mutation boundary
- `scripts/foundation-worker.ts` — independent scheduled worker
- `src/lib/accounting.ts`, `src/lib/policy.ts` — integer settlement and hard rules
- `src/lib/database.ts` — shared SQLite connection and preserved prototype persistence
- `contracts/`, `src/lib/near-*.ts`, `src/lib/wallet-auth.ts` — earlier testnet proofs
- `contracts/business`, `contracts/demo-vault`, `contracts/test-dollar`, `src/lib/business` — bounded token business rehearsal
- `scripts/business-proof.ts`, `scripts/business-rehearsal.ts` — dedicated testnet plan, journaled execution and verification
- `tests/`, `scripts/check-foundation-ui.mjs` — regression and browser verification

See [architecture](docs/architecture.md) and [demo runbook](docs/demo-runbook.md). Local hashes detect changes to recorded events; they provide no external attestation. Foundation receipts remain simulated. Business receipts represent test-token transfers on their explicitly recorded chain; vault returns remain controlled fixtures.
