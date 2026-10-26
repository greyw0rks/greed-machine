# Greed Machine

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

The existing prototype uses Next.js, TypeScript, Three.js, Framer Motion, and local SQLite. NEAR testnet hosts a policy-proof contract and a demo GREED token. Production launchpad, fee routing, execution venues, indexing, and stablecoin distribution infrastructure remain to be selected and implemented.

## Users

Holders buy GREED on a launchpad or supported market and hold it in their wallets. They receive their eligible share of business profits in a stablecoin such as USDC. Routine participation requires no Greed Machine account, connected dashboard, staking, or strategy vote. Voting is reserved for changes to the project's core rules.

Reviewers and interested holders can inspect public treasury activity, agent debates, security decisions, realized results, and payout receipts without connecting a wallet. Operators maintain execution infrastructure and respond to faults.

## Product Purpose

Build an automated on-chain treasury business: launch proceeds and project trading fees fund the treasury; an AI swarm discovers DeFi yield and other opportunities, proposes and debates strategies, selects a candidate, and submits it to independent security review and enforceable transaction controls. Approved strategies receive bounded capital. Settled profits are independently reconciled; 60–70% of distributable net profit goes to eligible holders and the remainder stays in the treasury.

## Positioning

GREED is a memecoin with treasury and profit-sharing mechanics. The user describes the experience as buying and holding a business-like token. Product copy should describe the implemented economic rights precisely, without implying guaranteed returns or corporate equity rights that have not been established.

## Operating Context

The normal holder journey is buy → hold → receive eligible stablecoin payouts. The website explains the business and publishes verifiable activity and results. Launchpad and token integration are deferred in the current foundation build. The current connected governance workspace is a prototype/operator tool; it is not the target holder experience. Rare core-rule votes may still require wallet verification.

## Capabilities and Constraints

Target treasury funding comes from a defined launch allocation and enforceably routed project trading fees, as explicitly chosen by the user. Holder payouts use a stablecoin such as USDC, also explicitly chosen by the user. Exact split within 60–70%, fee rate, launch allocation, chain/launchpad integration, payout cadence, and eligibility rules remain economic design decisions. A 65/35 split is an illustrative midpoint, not an approved deployed setting.

Agents propose and debate; independent review and deterministic controls authorize bounded execution. Hard limits, reserve protection, replay prevention, position monitoring, and emergency pause remain required. Payouts come from verified realized net profit after costs and loss recovery, never by relabeling contributed principal as earnings. Failed or losing strategies remain visible.

The current foundation runs scheduled simulation cycles and records synthetic USDC settlement, frozen fixture distributions, protected unpaid entitlements and retryable synthetic payout receipts. Its public records require no wallet connection; simulation controls live on a separate operator page. Live DeFi execution, holder indexing, launch funding/fee routing and on-chain stablecoin payouts remain to be implemented. Preserve the existing testnet evidence while replacing its role in the product journey.

## Brand Commitments

GREED MACHINE. On October 25, 2026 the user requested a replacement for the blue palette. The current palette uses warm ivory, charcoal and olive with amber accents, documented in `DESIGN.md`. The user chose an immersive Three.js experience and Framer Motion transitions. Brand expression belongs in the public site; financial evidence must remain legible and attributable.

## Evidence on Hand

The user's October 25, 2026 business-model clarification supersedes the governance-first journey in the original plan. The current direction is documented in `docs/business-model.md`.

The original reference remains archived at `docs/source-build-plan.md` from https://chatgpt.com/share/6add2b45-db38-83e9-bfeb-a66cf1d5bf17 . Public testnet policy and token proofs are in `evidence/near-testnet.json` and `evidence/governance-testnet.json`. The demo token allocated 650,000 units to `elchapi.testnet`; this is a test fixture, not production tokenomics. There are no verified live strategy returns or holder profit payouts.

## Product Principles

- Buying and holding is sufficient for ordinary holder participation.
- Routine strategy selection and execution occur autonomously within approved rules.
- Governance changes core rules; it does not approve individual yield opportunities.
- Agent debate and security review use attributable evidence; models never hold unrestricted treasury keys.
- Independent accounting establishes profit before any distribution.
- Public losses, costs, positions, and payout receipts make the business inspectable.
- Retained earnings support the treasury's reserve and future activity.
