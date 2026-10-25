# Foundation demo runbook

This demonstrates the current public simulation: competing agents, independent security, reconciled results and synthetic profit payouts. See [business model](business-model.md) for the target launchpad-funded business.

## Prepare

```bash
npm run verify
npm run dev
```

Open `http://localhost:3014`. For a separate demo ledger, set `GREED_DB_PATH` to a new SQLite filename before starting the web app and worker.

Use deterministic simulation mode for the ordinary demo. Provider recovery tests use local fixtures, so verification does not spend paid API credits.

## Show one complete cycle

1. Begin on the landing page. Explain the intended buy → hold → receive journey and the current synthetic-funds scope.
2. Open **Operator**, choose **Steady yield**, and select **Start cycle**. Enter the configured operator token if required.
3. Select **Advance one phase**, then open **The swarm**. Show competing proposals, challenges, responses and the selection. Selection does not authorize funding.
4. Advance again. Open **Security** and inspect its independent verdict and hard checks.
5. Advance into **funded**. **Activity** now separates liquid cash, capital reserved in a position and unpaid holder liabilities.
6. Advance into **settled**. The audit receipt separates returned principal, gross result, transaction cost, slippage and analysis cost. Earlier losses must be recovered before new profit is eligible.
7. Open **Distributions**. Show the frozen fixture snapshot, illustrative 65/35 allocation and individual integer entitlements. These are synthetic allocations.
8. In Operator, mark one fixture receiver unavailable, then select **Process payout batch**. Available recipients receive simulated receipts; the failed recipient retains its protected entitlement.
9. Clear the unavailable receiver and process another batch. Retry again to show that paid records are not paid twice.
10. Run **Rate reversal** and **Stale oracle**. Show the loss and the refused action, including the analytical costs of refusal.
11. Open **Audit trail**, inspect event evidence and select **Export evidence**.

## Demonstrate the independent worker

Start it in another terminal with the same database path:

```bash
npm run foundation:worker -- --enable
```

The default interval is ten seconds per phase. Visiting or refreshing public pages never starts a cycle. The worker persists completed phases, continues funded positions through a guardian pause, and processes pending payout batches when payments are allowed.

Ctrl+C stops the process. Restarting it continues from persisted state. Active workers renew their five-minute lease every fifteen seconds. An abruptly terminated process can leave that lease; another worker waits until it expires. Regression tests prove recovery in fresh processes and reject duplicate settlement/payout effects.

## Recover a provider failure

Known provider usage remains charged when an answer fails. Unknown usage, a timeout or an interrupted request blocks accounting and pauses allocations and payouts. The audit page shows each provider record and its status.

In Operator, select **Check worker recovery** after an interrupted process. An active lease is respected; an expired lease closes the unfinished phase without replaying paid calls. Enter the uncertain call's final provider-confirmed cost in USD and supporting invoice/usage evidence, then select **Record confirmed cost**. Record zero only with evidence that the request was not charged. Resolve every uncertain call before resuming operations explicitly.

Duplicate reconciliations are rejected. A late usage result that conflicts with an earlier invoice reopens the discrepancy. Provider invoice lookup is currently manual. A bill beyond synthetic cash remains unresolved until the ledger can cover it.

## Browser evidence

Build first, then run:

```bash
npm run check:foundation
```

The check starts an isolated production server and temporary database, so it does not change the normal demo ledger. It verifies the operator flow, failed recipient recovery, loss recovery, authentication/origin checks, exported evidence, refresh outages and all eight routes at desktop/mobile widths.

## Historical testnet evidence

The earlier NEAR policy and wallet/token proofs remain at [policy proof](near-policy-proof.md) and [wallet governance](wallet-governance.md). Their on-chain records concern synthetic policy inputs and a demo token. The foundation's **Core governance** page explains future scope; it does not expose those historical voting controls.

Live execution adapters, routed trading-fee income, production holder eligibility and on-chain stablecoin payouts remain future work.
