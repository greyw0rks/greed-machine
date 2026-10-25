# Threat Model

## Security objective

An untrusted agent may recommend a poor or malicious action, but it must not bypass deterministic policy, execute twice, drain the reserve, silently alter governance weight, or declare its own result profitable.

## Protected assets

- The integrity of the active mandate
- Synthetic treasury balances and ledger arithmetic
- Proposal uniqueness and execution state
- Governance ballots and snapshot weights
- Demo and wallet session identity
- Audit-event ordering and evidence
- Provider credentials supplied through environment variables

The proof CLI has isolated, faucet-funded testnet operator and guardian keys in ignored `.near/` files. They are never available to browser or model agents. There are no treasury keys or mainnet funds.

## Trust boundaries

- Browser input is untrusted.
- Model output is untrusted and parsed with strict schemas.
- Scenario fixtures are trusted versioned inputs for the demo.
- Policy and accounting code are trusted deterministic components.
- SQLite is trusted for local durability, but local machine administrators remain outside the protection boundary.
- NEAR RPC and optional model providers are external services and may be unavailable or dishonest.

## Controls

| Threat | Control | Evidence |
|---|---|---|
| Oversized allocation | Spend, exposure, and reserve checks | `tests/policy.test.ts`, Risk Lab probes |
| Unauthorized receiver | Exact venue-to-contract allowlist | Contract adversarial probe |
| Stale recommendation | Five-minute data freshness ceiling | Freshness adversarial probe |
| Expired proposal | Server-time expiry check | Expiry adversarial probe |
| Duplicate execution | Executed-ID table and replay rule | Replay probe and database tests |
| Agent policy override | Separate deterministic policy module | Agent output contains proposals only |
| False profitability | Independent integer accounting and reconciliation | `tests/evaluation.test.ts` |
| Ballot duplication | Composite proposal/holder primary key | Governance database test |
| Governance expansion | Immutable mandate validation bounds | Policy and governance tests |
| Role privilege escalation | Guardian ID checked only for pause; weight remains snapshot-based | Guardian test |
| Demo session tampering | HMAC signature, expiry, strict same-site HTTP-only cookie | Auth test |
| Wallet impersonation/replay | Browser/origin-bound NEP-413 nonce, atomic consumption, current full-access key | Wallet governance tests |
| Removed account key | Key rechecked before every wallet mutation | Wallet session test |
| Moving tokens after a snapshot | Historical block pinned for every balance view | Compiled-token Sandbox check |
| Rounding a quorum into approval | Raw token strings and BigInt quorum/majority | Exact quorum boundary test |
| Cross-site mutation | Exact same-origin check on POST | Browser check |
| Oversized request | 16 KB content-length limit and Zod schemas | API route |
| Audit rewriting | Previous-hash chain verified on read | Audit Log integrity state |
| Hidden provider charges after failure | Per-call journal before dispatch; usage booked before answer validation; settlement charges once | `tests/model-accounting.test.ts` |
| Unknown invoices presented as reconciled | Pending/uncertain calls block funding and payouts; evidenced operator resolution and explicit resume | Provider recovery tests and browser check |
| Interrupted paid work sent again | Expired-lease recovery closes unfinished provider phases without replay | Fresh-process provider recovery tests |
| Stale worker overwrites recovery | Lease renewal and ownership/expiry checks before phase commits | Long-phase heartbeat and stale-worker tests |
| Duplicate or conflicting invoice correction | Exact integer costs, observed-usage matching and idempotent resolution | Invoice reconciliation tests |
| Losses or unpaid rewards consume funding reserves | Fixed initial-principal reserve plus protected unpaid liabilities and known costs | `tests/foundation.test.ts` |

## Known limitations

- Demo sessions prove possession of a cookie, not control of a NEAR wallet or `$GREED` tokens.
- The same-origin check is appropriate for this single-origin demo but is not a complete production CSRF design behind arbitrary proxies.
- The audit chain does not stop a privileged filesystem user from replacing the whole database and recomputing hashes.
- SQLite is suitable for a single-instance demo, not horizontally scaled mutation traffic.
- Model prompts defend structurally against prompt injection, but a provider can still return low-quality reasoning.
- Token prices are operator-configured and should be updated when provider pricing changes.
- Provider accounting trusts valid reported usage and configured prices; invoice lookup is manual. An unverified or uncovered bill remains unresolved and blocks operations. The historical `/api/machine` model path does not use the foundation journal.
- The NEAR endpoint reads stored policy decisions, not treasury trades. It trusts RPC observations and operator-supplied synthetic inputs.
- The proof operator can change bounded contract mandates without holder votes; demo governance remains separate.
- The testnet contract account has a full-access operator key, which can redeploy code. Code-hash pinning detects a changed build when verified.
- Testnet keys must remain in ignored `.near/` credentials; the web app never reads them.
- Pending wallet challenges are capped at 1,000 and expired rows are cleaned up, but this is not per-client rate limiting. Add edge or reverse-proxy limits before exposure.
- Wallet governance trusts the configured RPC and local database. Historical block unavailability rejects votes; there is no current-balance fallback.
- The included token contract is a locally and publicly verified testnet fixture. Its administrative full-access key can upgrade deployed code; new snapshots require the pinned hash.
- Demo and wallet proposals share a synthetic mandate when demo mode is enabled. Disable demo sessions for wallet-only operation.

## Production hardening before real funds

1. Replace the concentrated testnet demo distribution with a reviewed governance distribution, validate wallet UX with the intended users, and disable demo sessions. Wallet authentication and a public testnet token are implemented.
2. Put policy authorization in a reviewed contract or isolated signer service with narrowly scoped keys.
3. Use a durable multi-instance database and serializable transaction strategy.
4. Add rate limits, structured security logging, secret rotation, and provider egress controls.
5. Anchor audit commitments externally and reconcile against real chain receipts.
6. Commission smart-contract, application, and economic/governance audits.
7. Assess regulatory requirements before token-linked profits or holder distributions.
