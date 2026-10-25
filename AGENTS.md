<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Current Greed Machine work

The user's revised buy/hold/automatic stablecoin payout journey supersedes the older governance-first roadmap. `PRODUCT.md`, `docs/business-model.md` and `docs/milestones.md` describe the current direction. The public autonomous simulation foundation and provider failure accounting are implemented. The provider-cost/lease BUG in older Atlas tasks is completed: requests are journaled before dispatch, known costs survive failures, uncertain calls block funding/payouts, recovery requires evidence, and stale workers cannot commit phases or automatically replay paid work. The current suite has 48 application tests; the browser report covers 18 desktop/mobile captures.

Continue from `docs/CHECKPOINT.md`, `docs/milestones.md` and `docs/testnet-plan.md`. The separate compiled NEAR business rehearsal now passes 25 local Sandbox checks; the application has 54 passing tests. It implements receipt-backed fixture funding and expenses, a bounded controlled vault, 60-second cadence, receipt-reconstructed holder snapshots, failed receiver registration/retry and exact signed-transaction recovery. Public business deployment and repository publication await explicit confirmation of the saved plan. Earlier Atlas tasks describing this rehearsal as unbuilt are stale. Production economics and venues remain unsettled; 65/35 is illustrative. Tests/browser checks must use temporary databases and mocked/local providers, preserve the demo database and earlier NEAR evidence, and never consume paid API credentials. The scheduled worker is not enabled by this handoff. Model agents never authorize capital or receive keys. No mainnet spending is authorized by this work.
