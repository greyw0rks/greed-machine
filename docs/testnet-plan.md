# Public NEAR rehearsal plan — completed

Prepared October 25, 2026 with `npm run business:plan`; the user confirmed both public steps. Completed on public testnet at 2026-10-25T22:47:12Z. The saved public rehearsal passed 11 checks and its finalized builds, ledger and recipient balances independently reconcile. Local compiled-contract verification separately passed 25 checks. See [public evidence](../evidence/business-testnet.json) and [finalized observation](../evidence/business-testnet-observation.json).

## Accounts and builds

Network: NEAR testnet, RPC `https://rpc.testnet.near.org`. Faucet-funded setup account: `greed-biz-1584eb30.testnet`. Required initial setup balance: **8.2242 test NEAR** (`8224200000000000000000000` yoctoNEAR), including child-account storage/funding and a 0.2 test NEAR setup buffer.

| Role | Public account |
| --- | --- |
| Treasury | `treasury.greed-biz-1584eb30.testnet` |
| Controlled vault | `vault.greed-biz-1584eb30.testnet` |
| gUSD demo token | `dollar.greed-biz-1584eb30.testnet` |
| GREED demo token | `token.greed-biz-1584eb30.testnet` |
| Restricted operator | `operator.greed-biz-1584eb30.testnet` |
| Guardian | `guardian.greed-biz-1584eb30.testnet` |
| Expense recipient | `provider.greed-biz-1584eb30.testnet` |
| Holder Alice | `alice.greed-biz-1584eb30.testnet` |
| Holder Bob | `bob.greed-biz-1584eb30.testnet` |
| Holder Carol | `carol.greed-biz-1584eb30.testnet` |

| Build | Bytes | NEAR code hash |
| --- | --- | --- |
| Treasury | 233379 | `Dv6uCtMHnd4BFWZArknHwPfxpm2eXDTsBtGgyKPoF7E5` |
| Vault | 135397 | `DRoRQ5RWEmAF42ewzxbND7i2dLmAV76LpqUjpmoimYNv` |
| gUSD and GREED tokens | 134322 each | `A9MBzLzezKhzgfKbyrzTTuKyhQAVGW4MjBKxr7Ex1mgS` |

The operator function-call key is limited to the treasury receiver and `execute`, `exit`, `pay_expense`, `freeze`, `pay`, with a 0.2 test NEAR gas allowance. Dedicated setup keys and the signed-transaction journal stay in ignored `.near/` files; they are excluded from publication and frontend build traces.

## Exact token cycle

1. Create the isolated accounts, deploy the four pinned builds and install the restricted operator key.
2. Initialize a separate one-million-unit GREED fixture: Alice 250,000; Bob 400,000; Carol 350,000. Register the treasury, vault, expense recipient, Alice and Bob for gUSD.
3. Transfer 1,000 gUSD launch-fixture principal and 5 gUSD fee-fixture revenue into the treasury. Seed the vault with 100 gUSD from the demo sponsor.
4. Pay a unique 2 gUSD fixture invoice to the expense recipient.
5. Record a deterministic fixture debate/security decision and execute exactly 100 gUSD into the allowlisted vault. Pause the treasury with the guardian, exit the existing position for 110 gUSD, then resume. The additional 10 gUSD comes from the sponsor fixture.
6. Transfer 100,000 GREED from Alice to Bob. Reconstruct and pin the complete holder snapshot: Alice 150,000; Bob 500,000; Carol 350,000.
7. Wait for the 60-second distribution cadence and freeze the period: 13 gUSD net result, 8.45 gUSD holder pool and 4.55 gUSD retained share. A later 50,000 GREED transfer from Bob to Alice leaves this frozen period unchanged.
8. Attempt Carol's gUSD payment before registration; verify the failed transfer retains its liability. Sponsor Carol's registration and pay the same entitlement. Final payments: Alice **1.2675 gUSD**, Bob **4.225 gUSD**, Carol **2.9575 gUSD**.
9. Independently compare deployed builds, finalized ledger, token balances and holder payments. Expected final treasury: **1,004.55 gUSD**, zero active capital and zero unpaid liabilities. Save public evidence only after all checks pass.

gUSD is unbacked and is not USDC. Launch proceeds, fee income and vault returns are labelled sponsor fixtures. This confirms NEAR token settlement and treasury rules; it does not establish a production business's yield or market fee routing.

## Execution and recovery

After the human confirms this exact plan, run `npm run business:deploy`, followed by `npm run business:verify`. The first command signs with only the dedicated testnet credentials. If the faucet cannot supply enough test NEAR, retain the same account and plan while funding is resolved.

Keep the original transaction journal, decision and snapshot on interruption. Unknown transaction status stops execution; do not create a replacement transaction or run ID. A completed rehearsal is verified on a resumed invocation without sending its payments again.

## Repository publication proposal

Proposed public repository: `https://github.com/greyw0rks/greed-machine`, branch `main`. Publish the reviewed source, lockfiles, README, reproduction guides, public proof JSON and demo screenshots. Exclude `.env*` credentials, `.near/`, private signed journals, databases, `.atlas/`, `.impeccable/`, `node_modules/`, `.next/` and Rust targets. The blank `.env.example` remains included for setup.

The user explicitly confirmed both testnet signing and creating/pushing this public repository. X publication and the final API payload have their own later human steps under [the supplied hackathon rules](HACKATHON.md#never-without-the-humans-explicit-confirmation).

Recovery used 0.13 test NEAR from the existing 0.2 setup buffer to satisfy the guardian's gas prepayment. The original pause hash `Ex4XZN1guNmZcCXEJyNr6qVtxqG6EuKMVeBEhb7Do6kX` was initially absent from RPC. A finalized unused signer nonce, unchanged treasury state and pinned code established that it had not executed; rebroadcasting the identical signed bytes returned a definite insufficient-balance rejection. After gas funding, the same bytes finalized under the same hash, without a new signature or replacement transaction. Plain holder token transfers now attach 30 Tgas; existing journaled treasury actions retain their original 180 Tgas. No demo-token amounts, recipients, run IDs or contract builds changed.
