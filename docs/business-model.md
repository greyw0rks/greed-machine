# Greed Machine business model

Product direction confirmed by the user on October 25, 2026. This document supersedes the earlier governance-first holder journey. It describes the target business; the existing app remains a simulation and testnet proof.

## The holder experience

A user buys GREED on a launchpad or supported market, holds it, and receives eligible profit distributions in a stablecoin such as USDC. The user does not connect to Greed Machine to run strategies, approve trades, stake, or claim ordinary payouts. Core-rule changes are the exceptional reason to verify a wallet and vote.

The public site should explain how the business earns, link to the actual purchase venue, and publish treasury addresses, agent debates, decisions, positions, costs, realized profit, losses, and distribution receipts. These are public evidence pages, not a connected holder dashboard. Existing Swarm Lab, Risk Lab, and simulation controls can remain operator/reviewer tools.

## Confirmed economic choices

| Item | Direction |
| --- | --- |
| Token | GREED, a memecoin with treasury and profit-sharing mechanics |
| Initial treasury funding | A defined allocation from launch proceeds |
| Ongoing treasury funding | Project trading fees plus retained earnings |
| Business activity | Autonomous discovery and execution of bounded DeFi opportunities |
| Holder share | 60–70% of distributable realized net profit |
| Treasury share | The remaining 30–40% |
| Payout asset | A stablecoin such as USDC |
| Ordinary holder action | Buy and hold |
| Governance | Core project changes only |

The exact split is not finalized. Use 65% to holders and 35% retained only as an illustrative midpoint until a precise policy is approved. Launch funding percentage and trading-fee rate are also unset.

## How money moves

```text
Launch allocation + project trading fees + retained earnings
                             |
                 Treasury and operating reserve
                             |
Opportunity scouts -> proposals -> debate -> candidate selection
                             |
     Independent AI security review + hard policy checks
                             |
      Bounded execution -> monitoring -> exit/harvest
                             |
         Receipt reconciliation and profit accounting
                             |
             Distributable realized net profit
                 /                    \
        60–70% to holders      30–40% retained
```

Selecting a winner does not require deploying it. The security reviewer or hard policy may reject every candidate, and holding cash must remain a valid outcome. The system may rescore another candidate, but cannot bypass failed controls because a debate produced a winner.

## Strategy lifecycle and authority

1. **Discover:** scouts read chain state and protocol data, identifying yield and opportunities with sources, timestamps, liquidity, assumptions, expected costs, and exit conditions.
2. **Propose:** each candidate specifies protocol/adapter, asset, maximum capital, minimum execution outcome, expiry, holding period, and risk limits.
3. **Debate:** agents challenge yield assumptions, contract exposure, exit liquidity, concentration, and failure scenarios. Rank expected net outcomes within the risk budget. Disagreement is useful evidence, not an authorization mechanism.
4. **Review:** an independent security/defense agent examines contracts, permissions, market manipulation, and execution paths. Deterministic checks separately enforce reviewed adapters, code/target constraints, spending ceilings, reserve floors, slippage limits, fresh inputs, simulation results, and replay protection.
5. **Fund:** an isolated executor signs only the exact validated action, within capped allowances. The language models cannot produce arbitrary authorized transactions or access signing keys.
6. **Monitor:** track actual positions, liquidity, drawdown, protocol changes, and exit triggers. A scheduled worker is responsible for continuation, retries, and emergency handling; a web-page visit never drives the business clock.
7. **Settle:** observe finalized on-chain results, reconcile asset movements, account for costs and losses, and close or harvest the position. An agent's narrative cannot establish profit.
8. **Distribute:** compute an eligible holder set and payout budget for a distribution period, retain the treasury share, pay holders, and publish finalized receipts.

Start with one reviewed execution adapter. Scouts may discover other opportunities, but expanding transaction permissions requires a reviewed adapter and the applicable core-rule process. Autonomous discovery does not imply unrestricted contract access.

## What counts as distributable profit

Recovered strategy principal returns to the treasury. It is not an earning. Unrealized token appreciation, advertised APY, and newly contributed launch capital are not distributable strategy profit.

The profit ledger must aggregate the business's settled gains and losses, gas, swap fees, realized slippage, agent/provider costs, and distribution costs. It must carry prior unrecovered losses forward, so a recovery from an earlier loss is not paid out as new profit. Avoid double-counting fees or slippage already reflected in observed cash flows. Open-position liabilities, pending withdrawals, and the required liquid reserve can further constrain the cash available for distribution.

Launch funding, project trading-fee receipts, strategy income, returned principal, operating expenses, holder payout liabilities, and retained earnings need separate ledger categories. Whether project trading-fee revenue joins the distribution base or stays entirely in the operating treasury remains to be defined; its receipt must not silently be classified as a DeFi strategy win.

An illustrative completed period, after all costs and loss recovery, has 10,000 USDC of distributable profit. At 65/35, holders collectively receive 6,500 USDC and 3,500 USDC is retained. A wallet with 1% of that period's eligible weight receives 65 USDC. If the payout budget is zero, the period creates no new payout liability. None of these figures is a promised return.

## Automatic stablecoin payouts

Ordinary payouts should be pushed to eligible holding wallets on a schedule. A claim-only design would contradict the intended holder experience.

An implementation needs a reconstructable holder index and a published eligibility policy. `ft_balance_of` verifies one known account's balance; it does not enumerate all holders. Track mint/transfer/burn events from deployment, validate indexing continuity and totals, and reconcile the distribution's final balances against chain state. The existing governance snapshot is reusable verification machinery, not a complete distribution engine.

Decide snapshot versus time-weighted holding eligibility before implementation. A single snapshot prevents transfer-based double counting within that period, but does not by itself prevent buying immediately before a payout. Treasury, burn, exchange, liquidity-pool and wrapper addresses need explicit treatment; do not assume a pool contract can forward a holder payout to its beneficial owners.

Payout records need a unique period/account key, integer stablecoin amounts, deterministic rounding, budget reconciliation, batched transfers, finalized receipts, and retries that cannot pay twice. If a wallet cannot receive the chosen stablecoin, preserve its unpaid entitlement. On NEAR, receiving an FT can require storage registration: budget and sponsor that registration where supported instead of asking every holder to use a connected claim flow. Small entitlements can accumulate under a published rule when per-wallet costs would dominate the payout. Protect both unpaid liabilities and execution reserves from reuse.

## Launchpad and fee routing

Buying or selling GREED does not inherently credit the project treasury. A selected launchpad/DEX must expose an enforceable fee route, or the token/pool design must implement one that its trading integrations support. Verify the complete route in transactions before forecasting fee income.

Investigate native launchpad/pool project fees first. Do not silently add a transfer tax: it is a separate economic and integration choice, can apply outside trading, and may be incompatible with a venue's expected transfer amounts. The existing demo NEP-141 token has no project trading-fee mechanism.

Before selecting a launch venue, establish launch allocation, liquidity allocation, fee rate and recipient, post-graduation behavior, and which supported trades actually produce project fees. The choice may constrain the chain and stablecoin. Existing NEAR testnet contracts provide reusable proof work; they do not settle the production launchpad decision.

## Core-only governance

| Autonomous within existing rules | Core changes requiring governance |
| --- | --- |
| Select or decline a strategy | Change holder/treasury profit split |
| Allocate within caps | Expand hard exposure or spending ceilings |
| Harvest or exit under approved conditions | Change payout asset or eligibility rules |
| Rebalance across reviewed adapters | Expand execution permissions or approved adapter scope |
| Perform scheduled payouts from verified liabilities | Upgrade treasury/executor/token authority |
| Retry failed operations safely | Change project fee economics or token supply rules |

Core proposals should carry precise changes and consequences, with authenticated eligibility, quorum, a suitable voting period, and a timelock. The prototype's five-minute votes are demonstration timings, not a chosen production policy. A narrowly scoped guardian may pause operations immediately under the safety policy; it cannot redirect assets or increase its voting weight.

## Build order

1. **Specify the economics:** choose a launchpad/fee route, initial treasury allocation, exact profit split, fee-income treatment, payout stablecoin, cadence, eligibility and reserve/loss-recovery rules.
2. **Prove the complete business loop in simulation:** run the swarm on a schedule, maintain positions and the portfolio profit ledger, freeze a payout period, allocate holder entitlements, and reconcile every unit through retained earnings and distributions. Include loss periods, transfer timing, failed recipients and restart recovery.
3. **Change the public experience:** buy/hold messaging, launchpad destination, public business activity and payout evidence. Move routine connected controls to operator/demo tools; retain a separate core-governance route.
4. **Prove one real adapter on testnet:** deposit, observe position, harvest/exit, reconcile a receipt and execute batched test stablecoin payouts with sponsored registration. Keep transaction permissions narrow.
5. **Connect core governance:** reuse wallet verification and snapshot accounting to update the project's constitution and permissions, rather than introducing holder approval for each trade.

The scheduled simulation loop, fixture profit distributions and provider failure recovery are now implemented. Public activity requires no wallet connection; Operator holds simulation controls and documented reconciliation of unknown provider costs. See [milestones](milestones.md) for validation. Launch funding/fee routes, real holder indexing, live adapters and on-chain stablecoin payouts remain unfinished. The earlier roadmap item to make governance the next central feature is superseded by this direction.
