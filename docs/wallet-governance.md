# Wallet governance

Product direction update: this implementation is now a foundation for rare core-rule votes. Holders will not need to sign in for routine strategy selection or profit payouts. The previous governance-first roadmap is superseded by [business model](business-model.md). The behavior described below is the current prototype.

Wallet governance proves control of a NEAR testnet account and reads `$GREED` voting weights from a pinned NEP-141 token contract. Passed proposals update the **simulated treasury mandate**. Neither sign-in nor voting submits a wallet transaction, transfers treasury funds, or changes the deployed policy-proof contract.

## Configure

Set these values in `.env.local`, then restart the app:

```dotenv
NEAR_RPC_URL=https://rpc.testnet.near.org
NEAR_GREED_TOKEN_ACCOUNT=token.greed-policy-8a07c217.testnet
NEAR_GREED_TOKEN_CODE_HASH=4Xg7MLo6sgEEQ64kGcfnWiQYtSpXdQonSEyqr6kJ3LxC
NEAR_GUARDIAN_ACCOUNT=guardian.greed-policy-8a07c217.testnet
DEMO_SESSIONS_ENABLED=false
COOKIE_SECURE=true
```

Use `COOKIE_SECURE=false` only for local HTTP. Both token account and code hash are required. The token must expose `ft_metadata`, `ft_total_supply`, and `ft_balance_of`, with NEP-141 metadata, symbol `GREED`, and 0–24 decimals. Supply must be positive. Review its implementation before pinning its hash; a matching symbol does not establish a trustworthy token.

The included `contracts/test-token` is a transferable test fixture initialized with 1,000,000 units and no mint method after initialization. It is deployed at [token.greed-policy-8a07c217.testnet](https://testnet.nearblocks.io/address/token.greed-policy-8a07c217.testnet), with finalized supply and balance evidence in [governance-testnet.json](../evidence/governance-testnet.json). Initial allocation:

| Account | Demo $GREED | Supply share |
| --- | ---: | ---: |
| `elchapi.testnet` | 650,000 | 65% |
| `greed-policy-8a07c217.testnet` | 250,000 | 25% |
| `guardian.greed-policy-8a07c217.testnet` | 100,000 | 10% |

This concentrated distribution deliberately lets the user's wallet complete the testnet demo alone. It is not a production governance distribution. Transfers change subsequent snapshots; force-unregistering a funded token account can burn its balance under the standard NEP-141 implementation. The existing public **policy** account is separate from this token contract.

## Sign in and vote

1. Select **Connect wallet**, then **Verify testnet wallet**. Choose a wallet supporting NEP-413 sign-in on testnet and approve the message.
2. The app verifies the signature against a current full-access account key and observes the balance at a finalized block. A zero-balance wallet can sign in, but cannot propose or cast a positive-weight vote.
3. Create a bounded mandate. The app fixes a new snapshot containing token account, code hash, block hash, height, timestamp, decimals, and total eligible supply.
4. Vote during the five-minute window. The app reads your balance at **that proposal's block**, regardless of later transfers. Each account gets one ballot per proposal.
5. After the deadline, finalize. Participation must reach at least 50% of the snapshot supply, and support must exceed half the cast weight. A successful proposal enters a one-minute timelock before its local mandate can execute.
6. Expand a proposal's snapshot details to export the snapshot and recorded ballots. Raw amounts remain decimal strings; quorum arithmetic uses `BigInt`.

The sign-in balance is an observation for orientation, not a promise of weight on every proposal. Demo proposals retain their separate synthetic identities and 20-second vote/10-second timelock. A demo identity cannot vote on a wallet proposal, and a wallet cannot vote on a demo proposal. When demo sessions are enabled, both proposal types affect the same synthetic mandate; disable demo sessions for a wallet-only presentation.

## Authentication boundary

- The server generates a 32-byte random nonce, binds the challenge to its origin and an HTTP-only browser cookie, and expires it after five minutes.
- NEP-413 signatures use the protocol domain tag and Borsh payload. No callback URL is accepted.
- Only a current Ed25519 full-access key qualifies. Function-call keys cannot authenticate as the account owner.
- Challenges are consumed atomically. Concurrent submissions cannot create two sessions from one signature.
- Session cookies contain opaque random tokens; SQLite stores SHA-256 token hashes. Sessions expire after one hour and sign-out revokes them server-side.
- Every authenticated wallet mutation rechecks the key on finalized testnet state. Removed keys and RPC failures block the mutation.
- Snapshots require a synchronized testnet RPC, a matching pinned build, consistent block evidence, and a finalized timestamp no more than two minutes old when created. Later ballot queries deliberately use the historical snapshot.
- Unknown/pruned historical blocks, changed code at snapshot creation, malformed quantities, and unavailable RPCs fail closed. There is no fallback to a current balance or synthetic voting weight.

RPC observations are not light-client consensus proofs. SQLite administrators and the configured RPC remain trusted. Full-access token keys can redeploy code; pinning checks the code at each new snapshot, while an existing proposal continues to refer to its historical build. An account's active key is checked per mutation, but the browser's displayed identity may remain until its next request or refresh.

## Reproduce verification

```bash
npm test
npm run token:build
npm run token:check
npm run build
npm run check:wallet -- --demo
```

The application tests use the independent NEAR SDK signer to exercise NEP-413 interoperability, invalid/replayed signatures, browser/origin binding, key revocation, network/code/block mismatches, exact quorum boundaries, identity separation, and timelocks.

`token:check` deploys the compiled token into a local NEAR Sandbox, verifies real account keys and token views, transfers tokens after a snapshot, and proves both original balances remain fixed for voting. It saves `evidence/governance-sandbox.json`. The harness maps only Sandbox's status response to testnet; production has no network override. Timelock checks pass explicit timestamps to the local governance functions.

`check:wallet` starts an isolated production app and RPC fixture, injects a test wallet through the real connector interface, signs with real Ed25519 keys, and drives desktop/mobile sign-in, proposal creation, voting, duplicate/deadline rejection, export, CSRF rejection, and sign-out. It does not automate a third-party wallet or contact public testnet. Results and captures are in `.impeccable/review/wallet-*`. `--demo` also runs the existing twelve-route simulation browser check. Browser verification requires an installed Playwright Chromium; `CHROMIUM_PATH` can select another build.

## Public deployment and verification

```bash
npm run governance:plan -- --holder elchapi.testnet
npm run governance:deploy -- --holder elchapi.testnet
npm run governance:verify
```

The plan prepares an isolated token key in ignored `.near/token-credentials.json` with mode `0600`. Deployment checks testnet and the recipients, creates a token subaccount with 3 faucet-funded testnet NEAR, deploys and initializes atomically, and verifies all initial balances at one finalized block. It refuses a different deployed build or recipient plan. Evidence is checkpointed with `completed: false` until verification succeeds. A later read-only verification observes current balances without requiring them to equal their initial allocation. Public app settings are written to `.near/governance.env`; the workspace's `.env.local` has been configured with them.

## Revised role in the product

Reuse signature verification, exact snapshot weights, quorum and timelocks for changes to profit split, hard risk limits, payout rules, execution permissions and upgrade authority. Routine strategy proposals proceed through the autonomous operating loop and hard policy checks. Building that loop and profit-distribution accounting now takes priority over extending the connected governance flow. See [business model](business-model.md).
