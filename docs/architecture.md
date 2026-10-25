# Architecture

The current public foundation runs scheduled simulation cycles and synthetic profit distributions. The target business and holder journey are in [business model](business-model.md). Earlier wallet/governance and NEAR modules remain preserved as separate testnet proof work.

## Current foundation

`src/lib/foundation/store.ts` persists configuration, treasury state, cycle phases, distribution snapshots and hash-linked events in separate `foundation_*` SQLite tables. The public shell reads `/api/foundation`; its separate Operator page performs same-origin mutations protected by `FOUNDATION_OPERATOR_TOKEN` outside localhost.

`scripts/foundation-worker.ts` loads Next.js environment files before opening the lazy database connection, then advances scouting → debate → independent security → funding → settlement. A five-minute persisted lease prevents concurrent phase commits. It renews every fifteen seconds and before/after provider calls; owner and expiry are checked for every renewal and phase commit. Lease loss aborts outstanding calls and prevents stale phase writes. A guardian pause stops new commitments and payments, while funded positions can settle. Public reads never advance phases.

Treasury cash plus position reservations equals initial principal plus cumulative net result minus paid distributions. Available cash excludes every unpaid entitlement. Funding rechecks prior executed proposal IDs and preserves 25% of initial principal as a fixed liquid reserve, including known analysis and execution costs. Losses do not shrink that floor.

`src/lib/foundation/distributions.ts` allocates only cumulative realized net result above the previously allocated high-water mark. Earlier losses must be recovered first. Frozen recipient weights use integer largest-remainder allocation with recipient-ID tie breaks. The illustrative holder share is configurable within 60–70%; existing periods retain their original split and snapshot.

Payout batches run in immediate SQLite transactions. Paid records never reenter the queue; failed records keep their liability and publish failure evidence. Less-attempted records take priority so failed receivers cannot starve later batches. Each successful synthetic payment moves cash and a protected liability together, leaving cash available after liabilities unchanged.

`foundation_model_calls` records each call before dispatch, including its cycle/phase, request hash, price snapshot, usage, response ID and booked cost. Valid usage debits cash and cumulative net result in an immediate transaction before answer validation. Settlement credits already-booked provider costs back into its calculation so the receipt includes each expense once. Failed cycles retain their booked net loss.

All parallel provider calls finish accounting before a rejection propagates. Model-phase failures pause subsequent scheduled analysis, including failures whose costs are fully known. Interrupted calls with known usage become failed records; calls without verified cost become uncertain. A phase that did not commit is closed without resending its paid calls. Late usage may update financial records after lease loss, but cannot authorize a phase. Conflicting late usage reopens reconciliation instead of silently replacing an invoice.

Public `accountingComplete` and reconciliation state exclude pending/uncertain calls. New cycles, funding and payouts cannot bypass that gate, even by switching agent mode or clearing a guardian pause. The protected `resolve-model-call` action requires exact integer microdollars and supporting evidence, rejects live-worker reconciliation and duplicate application, and leaves operations paused. Observed usage constrains the correction amount; costs that cannot be covered remain unresolved.

There are 48 application tests, including complete model settlement, malformed answers, delayed siblings, security failures, missing usage, timeouts, long-phase lease renewal, stale callbacks, conflicting invoices, uncovered bills and abrupt worker exits before/after usage booking. Browser verification uses a local provider fixture and temporary database. External transfers still require finalized receipts, holder indexing and ambiguous-result recovery; automatic provider invoice lookup remains unimplemented. The preserved historical model path does not use the foundation's journal.

## NEAR business rehearsal

`contracts/business` holds a separate NEP-141 test-token treasury. It records unique launch/fee funding, bounded expense transfers, vault positions and immutable distribution periods. A separate operator is limited by a function-call key and contract constraints; a guardian can pause new spending while exits remain possible. `contracts/demo-vault` holds actual test tokens and returns sponsor-seeded fixtures. `contracts/test-dollar` initializes separate fixed-supply gUSD/GREED fixtures with genesis mint events; the earlier token contract and deployments are unchanged.

`src/lib/business/holders.ts` reconstructs the rehearsal's complete token event history, deduplicates receipt/log identities, and reconciles all weights and the supply against pinned NEP-141 views. Frozen weights remain an operator-attested commitment within an immutable roster, rather than a trustless historical index proof. `journal.ts` saves exact signed bytes before dispatch and checks the original finalized transaction after an interruption; unknown results never produce a replacement transaction automatically.

`/testnet` and read-only `/api/business` display completed evidence separately from the foundation. Public verification checks every deployed build, treasury state, period and token balance at one fresh finalized block. Sandbox evidence cannot be promoted into a public testnet observation. Private credentials and signed journals stay in ignored `.near/` files and are excluded from frontend traces. The proof script does not enable the existing foundation scheduler or send its synthetic payouts onchain.

See [business demonstration](business-demo.md) for exact amounts, transaction recovery, receiver registration, test-only economics and verification limits.

## Preserved prototype and testnet modules

Greed Machine separates recommendation, authorization, execution, and accounting so no agent can approve its own financial action.

```text
Holder mandate
      |
      v
Competing scouts ----> adversarial review ----> portfolio selector
                                                   |
                                                   v
                                      deterministic policy engine
                                            | allowed / blocked
                                            v
                                      simulation settlement
                                            |
                                            v
                                  independent receipt + audit event
```

## Runtime boundaries

### Interface

The earlier treasury workspace used `/api/machine` and a connected holder session. Its modules remain for reuse; the current public interface uses `/api/foundation` and fixture recipients.

The Three.js scene is dynamically loaded only on the landing page. The workspace remains conventional DOM so financial evidence, controls, and tables stay accessible and legible.

### Agent layer

`src/lib/agents.ts` supports two modes:

- Deterministic simulation agents make reproducible proposals for the fixed benchmark.
- Optional OpenAI-compatible agents return Zod-validated JSON and recorded token usage.

Settlement returns are withheld from agent inputs. Agents receive ex-ante expectations and risk data, preventing the fixed benchmark from leaking its answer into the recommendation step.

### Authorization layer

`src/lib/policy.ts` evaluates every selected proposal against eight rules:

1. Contract and action allowlist
2. Per-transaction ceiling
3. Exposure ceiling
4. Reserve floor
5. Current mandate and fresh data
6. Proposal expiry
7. Replay protection
8. Emergency pause

Policy is ordinary deterministic TypeScript. Agents cannot edit the mandate, policy implementation, or result.

### Settlement and accounting

`src/lib/accounting.ts` calculates capital, proceeds, transaction cost, slippage, agent cost, gross result, and net result in integer microdollars. Reconciliation independently proves:

```text
proceeds - capital - transaction cost - slippage - agent cost = net result
```

Blocked actions deploy no capital but still retain analytical service cost, so refusal is not presented as free.

### Persistence and audit

Node SQLite stores runs, ledger entries, executed proposal identifiers, governance records, ballots, and events. Mutating financial operations use immediate transactions. Request keys make scenario execution idempotent.

Each event stores the previous event hash and a SHA-256 hash over its content. The dashboard verifies the complete chain before displaying the integrity state. This is tamper evidence inside the local database, not consensus or remote notarization.

### Governance

Demo proposals use a synthetic holder snapshot with a fixed eligible supply. Wallet proposals use NEP-413-authenticated accounts and a finalized NEP-141 snapshot pinned to a token account, code hash, block hash, and raw supply. Historical balance views determine ballot weight; exact `BigInt` totals decide quorum. Voting weight equals snapshot balance, each holder may cast one ballot, quorum and majority are checked after the deadline, and successful proposals enter a timelock before execution.

Governance can change only three bounded fields: maximum spend, maximum exposure, and minimum reserve. It cannot expand the hard ceilings embedded in policy.

`/api/wallet` issues browser-bound signature challenges and exchanges valid signatures for one-hour revocable sessions. `/api/machine` rechecks wallet access keys before mutations. Wallet proposals have a five-minute vote and one-minute timelock. Demo and wallet identities cannot cross-vote. Both change only the synthetic treasury mandate. See [wallet governance](wallet-governance.md).

### NEAR boundary

`contracts/policy` records eight-rule decisions about a fixed synthetic principal. An isolated operator may record decisions or adjust bounded mandates; a separate guardian may only pause. It has no treasury transfer method.

`/api/near` verifies testnet, checks the deployed code hash, and reads a configured policy and decision at one finalized block. It cannot sign transactions. Only the operator CLI in `scripts/near-proof.ts` accesses ignored testnet credentials. The app's governance and simulation ledger do not mutate this contract. See [NEAR policy proof](near-policy-proof.md).

## Data classification

| Data | Source | Meaning |
|---|---|---|
| USDC balance | Synthetic SQLite seed | Demo principal only |
| Demo `$GREED` balances | Fixed synthetic snapshot | Demo voting weights only |
| Wallet `$GREED` balances | Pinned finalized NEP-141 views | Testnet token weights for wallet proposals |
| Scenario returns | Versioned local fixtures | Evaluation inputs, not forecasts |
| Model usage | Provider response | Accounted only when valid token counts exist |
| NEAR policy proof | Finalized contract views via testnet RPC | Stored decisions over synthetic inputs |
