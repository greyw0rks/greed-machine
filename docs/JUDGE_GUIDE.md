# Try Greed Machine

Start a simulation cycle, see how its proposals are reviewed, recover a failed holder payment, then inspect the separate completed NEAR testnet rehearsal.

The app works locally without a wallet, Rust, environment file or paid API key. The simulation uses fixture markets and synthetic USDC. The NEAR rehearsal uses actual transfers of unbacked gUSD demonstration tokens and sponsor-funded returns. Neither is evidence of investment performance.

## Start the app

Use **Node.js 22.22.2 or newer**, npm and Git:

```sh
git clone https://github.com/greyw0rks/greed-machine.git
cd greed-machine
npm ci
npm run dev
```

Open [localhost:3014](http://localhost:3014). No `.env` file is required. Keep the default **Deterministic simulation** mode. The app creates its local demo ledger automatically; reading public pages does not start a business cycle.

For a production build, stop the development server and run `npm run build`, then `npm start`. The address is the same.

## Do this, see that

| Action | Visible result |
| --- | --- |
| Open **Operator**, choose **Steady yield**, click **Start cycle**. | A new cycle appears in **Activity**. |
| Click **Advance one phase**, then open **The swarm**. | Competing proposals, challenges and the selected proposal appear. Selection has not yet authorized funding. |
| Advance again and open **Security**. | Independent review and fixed rules produce a verdict. |
| Advance into **funded**, then **settled**. | The ledger distinguishes liquid cash, position principal, costs and net result. Eligible profit creates a frozen distribution. |
| In Operator, select one **unavailable receiver**, then **Process payout batch**. | **Distributions** shows paid recipients and a failed payment whose entitlement stays protected. |
| Set **All fixture receivers available** and process the batch again. | The failed entitlement becomes paid. Paid records are excluded from later batches. |
| Run **Stale market feed** and advance its phases. | Security refuses funding; allocated capital is zero. |
| Run **Rate reversal**. | A loss is recorded. Later gains must recover losses before additional profit can be shared. |
| Open **Audit trail** and **Export evidence**. | Inspect the event chain, recorded costs, decisions and payment outcomes. |

Localhost controls need no operator token on a fresh clone. A configured server may require its operator token; the field is in Operator. See the [longer simulation runbook](demo-runbook.md) for the optional worker and provider-failure examples.

## Verify the NEAR proof

Open **NEAR proof**, or [localhost:3014/testnet](http://localhost:3014/testnet). The repository includes the completed public rehearsal, so contract compilation and signing credentials are unnecessary.

1. Inspect the saved ledger and frozen holder payments.
2. Click **Verify on NEAR testnet**. The app reads a fresh finalized block and checks all four deployed code hashes and treasury balances. It signs no transaction and sends no payment.
3. See **Finalized treasury balances reconcile**, then follow a public link in **Transaction evidence**.

The completed rehearsal reconciles **1,004.55 gUSD treasury**, **8.45 gUSD paid** and **zero unpaid liabilities**:

`1,000 principal + 5 fee fixture + 10 vault-return fixture − 2 expense − 8.45 payments = 1,004.55`.

The three recipient balances are 1.2675, 4.225 and 2.9575 gUSD. The 65/35 split and 60-second cadence are demonstration settings. The contract accepts operator-attested snapshots inside an immutable roster; it is not a production holder indexer. Setup keys can upgrade the testnet contracts, and hash verification detects such changes.

If the public RPC is unavailable, the page retains the saved rehearsal and reports the live verification error. That saved result must not be mistaken for a fresh observation. Full amounts, receipts and boundaries are in [business-demo.md](business-demo.md).

## Checks and optional contract reproduction

```sh
npm run typecheck
npm test
npm run build
```

The 54 application tests use temporary databases and mocked providers. They do not consume paid API credits.

To run the compiled business contract rehearsal on an isolated local chain, additionally install Rust 1.93 or newer, the `wasm32-unknown-unknown` target, and allow the NEAR Sandbox binary download:

```sh
rustup target add wasm32-unknown-unknown
npm run business:build
npm run business:check
```

That optional check creates a new local Sandbox report. It does not replay the published testnet transactions. Do not run `business:deploy` to inspect the existing proof.

## Scope and sources

The [initial implementation](https://github.com/greyw0rks/greed-machine/commit/26e4316) was committed October 25, within the October 19–November 14 development window. The [follow-up changes](https://github.com/greyw0rks/greed-machine/compare/26e4316...near-hackathon-2026) are on the hackathon branch. No earlier tracked baseline exists.

See [third-party notices](../THIRD_PARTY_NOTICES.md), [MIT license](../LICENSE), [architecture](architecture.md) and [business model](business-model.md). Model agents propose actions and never receive treasury signing keys. Launchpad fee routing, organic revenue, live DeFi execution and production USDC payouts are future work.
