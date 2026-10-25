# Greed Machine: Complete Build Plan

<text color="secondary" size="sm">NEAR Hackathon · November 1–14, 2026 · Autonomous Business + AI Swarms + AI Security & Defense</text>

Greed Machine should feel like a real autonomous treasury business, not another memecoin dashboard with an AI chatbot attached.

The product needs to prove one complete loop: **holders set the mandate, competing agents evaluate opportunities, deterministic security controls authorize actions, and accounting verifies the outcome.**

## 1. Product direction

<box gap={3}>
  <AsyncImage query="dark institutional quantitative trading terminal black graphite lime green financial data dashboard risk analytics futuristic minimal UI" aspectRatio="16:9" width="100%" radius="xl" />
  <title size="xl">GREED MACHINE</title>
  <text color="secondary" size="sm">An autonomous treasury governed by holders and constrained by code.</text>
  <row gap={2} wrap="wrap">
    <badge color="success">Autonomous Business</badge>
    <badge>AI Swarms</badge>
    <badge>AI Security</badge>
    <badge>Memecoin Mechanics</badge>
  </row>
</box>

**Product thesis:** Greed Machine operates a policy-controlled treasury. An AI swarm proposes and challenges financial decisions, token holders govern the strategy mandate, a deterministic policy engine restricts execution, and an auditable accounting layer measures actual outcomes after costs.

The key differentiation is not that it uses multiple agents. It is that it can demonstrate whether those agents produce better decisions than a single agent or doing nothing, and whether its security layer catches dangerous actions.

### What the MVP must prove

- A holder can vote on a strategy mandate using $GREED-based voting power.
- Multiple independent agents can disagree about an opportunity.
- A risk agent can challenge a proposed allocation.
- The security engine can reject an unsafe transaction.
- A permitted action can complete in simulation or on NEAR testnet.
- The accounting engine calculates net results and agent costs.
- A reviewer can reproduce the evidence behind the final result.

**Important:** simulated profitability is not evidence of real-world investment performance. Keep simulation, testnet execution and any future mainnet activity visibly separate.

---

## 2. Scope: what to build and what not to build

<box border radius="xl" padding={3} gap={3}>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="44px" align="center" justify="center">
      <icon name="check-circle" size="xl" color="success" />
    </box>
    <box flex="1" gap={1}>
      **Build for the hackathon**

      Holder governance, competitive AI agents, a deterministic risk engine, a treasury simulator, verifiable accounting, a dashboard and a NEAR testnet proof where feasible.
    </box>
  </row>
  <divider color="subtle" />
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="44px" align="center" justify="center">
      <icon name="shield-alert" size="xl" color="danger" />
    </box>
    <box flex="1" gap={1}>
      **Defer**

      Real-money launch, unrestricted AI custody, cross-chain trading, a full agent marketplace, a broad DeFi integration suite and promises of holder returns.
    </box>
  </row>
</box>

For the first demo, use deterministic market scenarios and mock transactions. Add one real NEAR testnet interaction only after the core loop works. This protects the project from spending its entire development window debugging integrations.

## 3. Architecture

<box border radius="xl" padding={3} gap={2} align="center">
  <box background="surface-secondary" radius="lg" padding={3} width="100%" align="center" gap={1}>
    <icon name="users" size="xl" />
    **1. Governance**
    <text color="secondary" size="sm" textAlign="center">$GREED balance snapshot · Discord roles · mandate proposal</text>
  </box>
  <icon name="arrow-down" color="secondary" size="lg" />
  <box background="surface" border radius="lg" padding={3} width="100%" align="center" gap={1}>
    <icon name="brain-circuit" size="xl" />
    **2. Competitive AI swarm**
    <text color="secondary" size="sm" textAlign="center">Opportunity scouts · strategy agent · adversarial risk agent</text>
  </box>
  <icon name="arrow-down" color="secondary" size="lg" />
  <box background="surface" border={{size:1,color:"#C7FF3D"}} radius="lg" padding={3} width="100%" align="center" gap={1}>
    <icon name="shield-check" size="xl" color="#C7FF3D" />
    **3. Deterministic policy engine**
    <text color="secondary" size="sm" textAlign="center">Allowlist · exposure limits · reserve rules · expiry · replay protection</text>
  </box>
  <icon name="arrow-down" color="secondary" size="lg" />
  <grid columns={2} gap={2}>
    <grid-item>
      <box border radius="lg" padding={3} gap={1} align="center" height="100%">
        <icon name="layers" size="lg" />
        **4A. Execution**
        <text color="secondary" size="sm" textAlign="center">Simulator first; NEAR testnet adapter</text>
      </box>
    </grid-item>
    <grid-item>
      <box border radius="lg" padding={3} gap={1} align="center" height="100%">
        <icon name="calculator" size="lg" />
        **4B. Accounting**
        <text color="secondary" size="sm" textAlign="center">Receipts, costs, realized P&L and audit trail</text>
      </box>
    </grid-item>
  </grid>
  <icon name="arrow-down" color="secondary" size="lg" />
  <box background="surface-secondary" radius="lg" padding={3} width="100%" align="center" gap={1}>
    <icon name="chart-no-axes-combined" size="xl" />
    **5. Evaluation dashboard**
    <text color="secondary" size="sm" textAlign="center">Swarm vs single agent vs no-trade baseline</text>
  </box>
</box>

### The trust boundary

The AI agents must **never have unrestricted access to treasury keys**.

Agents submit structured proposals. A separate policy engine evaluates the proposed action against hard rules. Only authorized actions reach the execution adapter.

The accounting system must independently calculate results from balances, receipts, transaction fees and recorded costs. An LLM must not be allowed to declare its own proposal profitable.

### Recommended stack

| Layer | Choice | Purpose |
|---|---|---|
| Frontend | Next.js + TypeScript | Dashboard and interactive labs |
| UI | Tailwind CSS + shadcn/ui | Consistent, fast component development |
| Charts | Recharts | P&L, benchmark and risk visuals |
| Backend | Node.js + TypeScript | Agent orchestration and APIs |
| Database | PostgreSQL + Prisma | Proposals, decisions, events and accounting |
| AI layer | Provider-agnostic adapters | Swappable models with token/cost tracking |
| NEAR | Rust + a currently supported NEAR SDK | On-chain governance or policy proof |
| Community | Discord integration | Holder access, notifications and proposal links |

Keep the core business logic in TypeScript initially. Introduce Rust contracts only for functionality that genuinely needs on-chain verification. Confirm the current NEAR SDK and deployment tooling before implementing the contract layer.

### Suggested repository structure

```text
greed-machine/
├── apps/
│   ├── web/
│   ├── api/
│   └── discord-bot/
├── packages/
│   ├── agents/
│   ├── policy-engine/
│   ├── accounting/
│   ├── evaluation/
│   └── shared/
├── contracts/
│   ├── governance/
│   └── treasury/
├── tests/
│   ├── adversarial/
│   ├── accounting/
│   └── scenarios/
└── docs/
    ├── architecture.md
    ├── threat-model.md
    └── demo-runbook.md
```

---

## 4. AI swarm design

Do not build five agents that all call the same model and produce similar summaries. That adds complexity without proving a swarm is useful.

Start with three distinct analytical roles and one coordinator.

<box gap={3}>
  <row align="start" gap={3}>
    <AsyncImage query="minimal abstract financial intelligence radar visualization green dark background" aspectRatio="3:4" maxWidth="100px" radius="lg" />
    <box flex="1" gap={1}>
      **Opportunity scouts**

      Two independent scouts examine the same market snapshot and propose opportunities or recommend no action. They must return structured data: expected return assumptions, downside risk, fees, liquidity assumptions and confidence.
    </box>
  </row>
  <divider color="subtle" />
  <row align="start" gap={3}>
    <AsyncImage query="minimal abstract adversarial cybersecurity shield violet black technical visualization" aspectRatio="3:4" maxWidth="100px" radius="lg" />
    <box flex="1" gap={1}>
      **Adversarial risk agent**

      Attempts to disprove the proposal. It checks concentration, unrealistic assumptions, stale data, slippage, contract risk and whether the proposed action violates the mandate.
    </box>
  </row>
  <divider color="subtle" />
  <row align="start" gap={3}>
    <AsyncImage query="minimal abstract quant trading allocation matrix terminal black neon lime visualization" aspectRatio="3:4" maxWidth="100px" radius="lg" />
    <box flex="1" gap={1}>
      **Portfolio selector**

      Compares the candidate proposals, applies a consistent scoring rubric and recommends an allocation or no-trade outcome. It cannot override the security engine.
    </box>
  </row>
</box>

Each agent should have a distinct role, input/output schema and logged cost. Run them on the same scenarios so the comparison is fair.

### The benchmark that makes this credible

Measure three approaches using the same starting capital, historical or synthetic data, constraints and evaluation windows:

1. Multi-agent swarm.
2. Single-agent strategy.
3. No-trade baseline.

Track:

- **Cost per decision:** model and service costs divided by completed evaluations.
- **Risky actions caught:** unsafe scenarios correctly blocked, with false positives also recorded.
- **Net outcome:** realized result after transaction costs, slippage assumptions and agent costs.
- **Downside risk:** drawdown and loss distribution, not just average returns.

Avoid cherry-picking successful scenarios. Use a fixed, documented test set and report all results, including cases where the swarm performs worse.

---

## 5. Governance: $GREED + Discord

The token supplies voting weight. Discord supplies the community interface and access roles.

<box border radius="xl" padding={3} gap={3}>
  <title size="lg">Governance flow</title>
  <list connector="solid" marker="number" gap={2}>
    <list-item>Holder connects a wallet and verifies eligible $GREED balance.</list-item>
    <list-item>A defined balance snapshot determines voting power.</list-item>
    <list-item>A proposal defines a permitted mandate change within hard safety limits.</list-item>
    <list-item>Holders vote through the authenticated governance flow linked from Discord.</list-item>
    <list-item>The outcome and any timelock are recorded and shown in the dashboard.</list-item>
  </list>
</box>

**Voting power formula:**

\[
\text{Voting power}_i=\text{eligible } \$GREED_i
\]

For example, a wallet with 25,000 eligible tokens out of 1,000,000 has 2.5% of eligible voting power.

Choose a snapshot and voting-window policy before implementation. A snapshot prevents a holder from counting the same tokens twice merely by transferring them between wallets during the voting period, but it does not eliminate whale concentration or every governance attack.

Suggested roles:

- **Verified Holder:** verified wallet and voting eligibility.
- **Researcher:** submits research and strategy proposals.
- **Guardian:** flags suspicious proposals and can invoke a narrowly scoped emergency pause.

Roles must not create extra voting power. Guardians must not be able to transfer treasury funds or override immutable safety limits. Do not use Discord emoji reactions as the sole record of a financial governance vote.

For the MVP, governance should change a bounded strategy mandate, not authorize arbitrary transactions.

---

## 6. UI choice and design system

The visual direction should be **an institutional trading terminal inside a controlled machine room**: dense data, restrained aggression, visible risk and minimal decoration.

<box gap={2}>
  <AsyncImage query="premium dark quant trading terminal UI graphite panels lime green metrics violet agent analytics risk monitoring dashboard modern web app" aspectRatio="16:9" width="100%" radius="xl" />
  <text color="secondary" size="sm">Visual reference only. Build the real interface with reusable components and real state, not as a static mockup.</text>
</box>

### Color palette

<grid columns={2} gap={2}>
  <grid-item>
    <box background="#0B0D0C" border={{size:1,color:"#343A35"}} radius="lg" padding={3} gap={1}>
      <box background="#0B0D0C" height="30px" radius="md" />
      <text color="#F4F5F0" weight="medium">Machine Black</text>
      <text color="#B3B8B2" size="sm">#0B0D0C · Main canvas</text>
    </box>
  </grid-item>
  <grid-item>
    <box background="#151916" border={{size:1,color:"#343A35"}} radius="lg" padding={3} gap={1}>
      <box background="#151916" height="30px" radius="md" />
      <text color="#F4F5F0" weight="medium">Graphite</text>
      <text color="#B3B8B2" size="sm">#151916 · Panels</text>
    </box>
  </grid-item>
  <grid-item>
    <box background="#C7FF3D" radius="lg" padding={3} gap={1}>
      <box background="#C7FF3D" height="30px" radius="md" />
      <text color="#11150B" weight="medium">Greed Lime</text>
      <text color="#303D16" size="sm">#C7FF3D · Actions and emphasis</text>
    </box>
  </grid-item>
  <grid-item>
    <box background="#A78BFA" radius="lg" padding={3} gap={1}>
      <box background="#A78BFA" height="30px" radius="md" />
      <text color="#171126" weight="medium">Agent Violet</text>
      <text color="#30224D" size="sm">#A78BFA · Agent activity</text>
    </box>
  </grid-item>
  <grid-item>
    <box background="#F4F5F0" radius="lg" padding={3} gap={1}>
      <box background="#F4F5F0" height="30px" radius="md" />
      <text color="#151916" weight="medium">Machine White</text>
      <text color="#454A45" size="sm">#F4F5F0 · Primary text</text>
    </box>
  </grid-item>
  <grid-item>
    <box background="#FF6B61" radius="lg" padding={3} gap={1}>
      <box background="#FF6B61" height="30px" radius="md" />
      <text color="#29100E" weight="medium">Risk Coral</text>
      <text color="#4D1A16" size="sm">#FF6B61 · Warnings and rejection</text>
    </box>
  </grid-item>
</grid>

Use lime sparingly for the main action, selected navigation and key metrics. Violet identifies AI-agent activity. Coral means risk, errors or blocked execution. Never rely on color alone to communicate risk; use explicit labels and icons.

### Typography and components

- **Headings:** Space Grotesk or Geist Sans.
- **Body:** Inter or Geist Sans.
- **Numbers, transaction IDs and logs:** Geist Mono or IBM Plex Mono.
- **Layout:** 12-column desktop grid, 8px spacing system, compact information-dense panels.
- **Corners:** 8–12px radius.
- **Borders:** thin graphite lines, minimal shadows.
- **Motion:** short, purposeful transitions. Avoid constant pulsing and decorative animations.
- **Responsive behavior:** desktop-first for the demo, but governance and audit views should remain usable on mobile.

Use Tailwind and shadcn/ui for implementation speed. Build a coherent design system rather than independently styling every page.

---

## 7. Dashboard and UX plan

Use five main navigation items. Keep the primary workflow easy to follow: mandate → proposals → security decision → result → evidence.

<box border radius="xl" padding={3} gap={3}>
  <row align="center" gap={2}>
    <icon name="layout-dashboard" size="lg" />
    <title size="lg">01 · Overview</title>
  </row>
  <AsyncImage query="dark finance analytics dashboard treasury balance realized pnl agent costs risk metrics black lime green minimal UI" aspectRatio="16:9" width="100%" radius="lg" />
  Show treasury balance, realized net P&L, agent costs, decision cost, current mandate and the latest policy decisions. A persistent label must identify whether the data is simulated, testnet or mainnet.
  <divider color="subtle" />
  <row align="center" gap={2}>
    <icon name="brain-circuit" size="lg" />
    <title size="lg">02 · Swarm Lab</title>
  </row>
  <AsyncImage query="dark AI multi agent workflow dashboard competing strategy cards risk analysis proposals lime violet technical UI" aspectRatio="16:9" width="100%" radius="lg" />
  Show each proposal, its assumptions, the risk agent's challenge, the final recommendation and model costs. Provide a replayable evaluation and a direct comparison with the single-agent baseline.
  <divider color="subtle" />
  <row align="center" gap={2}>
    <icon name="shield-check" size="lg" />
    <title size="lg">03 · Risk Lab</title>
  </row>
  <AsyncImage query="dark cybersecurity policy engine dashboard transaction approval rejection risk rules audit event console lime coral UI" aspectRatio="16:9" width="100%" radius="lg" />
  Display the attempted action, the rule evaluated, the allow/reject outcome and the evidence. Include scenarios for excessive exposure, unauthorized contracts, expired proposals and replay attempts.
  <divider color="subtle" />
  <row align="center" gap={2}>
    <icon name="vote" size="lg" />
    <title size="lg">04 · Governance</title>
  </row>
  <AsyncImage query="dark DAO governance token weighted voting proposals quorum countdown connected wallet interface lime green minimal UI" aspectRatio="16:9" width="100%" radius="lg" />
  Display connected wallet, eligible $GREED balance, voting weight, snapshot block or timestamp, proposals, quorum, voting deadlines and outcomes. Link Discord discussions to the canonical proposal page.
  <divider color="subtle" />
  <row align="center" gap={2}>
    <icon name="scroll-text" size="lg" />
    <title size="lg">05 · Audit Log</title>
  </row>
  <AsyncImage query="dark technical financial audit event log transaction hashes accounting ledger compact monospace UI" aspectRatio="16:9" width="100%" radius="lg" />
  Provide a chronological, filterable record of mandates, agent proposals, policy decisions, transaction receipts, costs and reconciliations. Every displayed result should be traceable to its evidence.
</box>

### Critical UX details

- Always show whether the product is in **Simulation**, **Testnet** or **Mainnet** mode.
- Explain why an action was blocked rather than simply displaying “Failed.”
- Make the winning proposal and rejected alternatives visible.
- Show model costs beside decisions, not buried in settings.
- Label hypothetical returns and scenario assumptions.
- Make it possible to replay the same scenario and inspect the result.
- Avoid fake live metrics, fabricated transaction hashes or sample values presented as actual treasury results.

---

## 8. Accounting and security rules

This is where Greed Machine can become more than a visual demo.

### Deterministic policy checks

Every proposed action should be checked for:

1. Approved contract and action type.
2. Maximum per-transaction spending.
3. Maximum protocol or asset exposure.
4. Required reserve balance.
5. Mandate and proposal validity.
6. Deadline or expiry.
7. Duplicate execution or replay protection.
8. Emergency pause status.

The AI may recommend an action, but it cannot alter these rules itself.

### Deterministic accounting

For a closed evaluation period, calculate:

\[
\begin{aligned}
\text{Net result} ={}& \text{realized proceeds}\\
&-\text{capital deployed}\\
&-\text{transaction costs}\\
&-\text{slippage and other costs}\\
&-\text{agent-service costs}
\end{aligned}
\]

Keep principal, unrealized changes, realized gains and expenses separate in the ledger. Use receipts and recorded balances to reconcile executed actions. Simulations use explicitly labelled scenario data rather than fabricated on-chain evidence.

Do not implement real holder distributions in the MVP unless the legal, accounting and contract requirements have been assessed. A token-linked claim on profits may raise securities and other regulatory questions.

---

## 9. Build schedule

The plan below uses the November 1–14 hackathon window. The practical strategy is to prepare the foundation before the event where permitted, then make the substantive hackathon build, documentation and demo clear and reproducible.

<box border radius="xl" padding={3} gap={3}>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" padding={2} minWidth="84px" align="center">
      <title size="md">Oct 24–31</title>
      <text color="secondary" size="xs">Preparation</text>
    </box>
    <box flex="1" gap={1}>
      **Foundation and design**
      - Finalize architecture, threat model and data schemas.
      - Confirm NEAR SDK, testnet setup and any intended integrations.
      - Build the dashboard shell, scenario runner and deterministic accounting.
      - Define benchmark scenarios and the evaluation protocol.
    </box>
  </row>
  <divider color="subtle" />
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" padding={2} minWidth="84px" align="center">
      <title size="md">Nov 1–4</title>
      <text color="secondary" size="xs">Core loop</text>
    </box>
    <box flex="1" gap={1}>
      **Swarm and evaluation**
      - Implement independent scouts, risk agent and selector.
      - Add structured proposal schemas and cost tracking.
      - Run swarm, single-agent and no-trade comparisons.
      - Display proposal disagreements and decisions.
    </box>
  </row>
  <divider color="subtle" />
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" padding={2} minWidth="84px" align="center">
      <title size="md">Nov 5–8</title>
      <text color="secondary" size="xs">Trust layer</text>
    </box>
    <box flex="1" gap={1}>
      **Security, governance and NEAR**
      - Implement hard policy checks and adversarial scenarios.
      - Add wallet verification and token-weighted voting.
      - Integrate Discord roles and proposal links.
      - Complete one testnet proof if the core system is stable.
    </box>
  </row>
  <divider color="subtle" />
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" padding={2} minWidth="84px" align="center">
      <title size="md">Nov 9–11</title>
      <text color="secondary" size="xs">Integration</text>
    </box>
    <box flex="1" gap={1}>
      **Product quality**
      - Finish the dashboard, audit trail and error states.
      - Reconcile accounting with scenario or transaction evidence.
      - Write README, architecture, threat model and demo instructions.
      - Test a clean setup from the public repository.
    </box>
  </row>
  <divider color="subtle" />
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="md" padding={2} minWidth="84px" align="center">
      <title size="md">Nov 12–14</title>
      <text color="secondary" size="xs">Submission</text>
    </box>
    <box flex="1" gap={1}>
      **Freeze, verify and demonstrate**
      - Fix critical bugs; avoid new major features.
      - Record a reproducible end-to-end demo.
      - Make the repository public by the deadline.
      - Publish the required public X demo post.
      - Validate the submission payload and submit only after your explicit confirmation.
    </box>
  </row>
</box>

The provided hackathon instructions specify a November 14, 2026, 23:59 UTC deadline for development and submission, a public repository, and a public X demo post. Mainnet deployment is not stated as a universal requirement. <FileCite ref_id="turn1file0" />

---

## 10. MVP checklist

Use this checklist to track the actual build. The items are acceptance criteria, not claims that the features already exist.

{@body const tasks = [
{section:"Foundation",items:[
"Repository, environment configuration and database migrations work",
"Simulation, testnet and mainnet modes are clearly separated",
"Scenario data and evaluation windows are reproducible"
]},
{section:"AI swarm",items:[
"Two independent scouts generate structured proposals",
"Risk agent challenges proposals with recorded evidence",
"Portfolio selector can choose a proposal or no-trade",
"Model usage and cost are logged per decision",
"Swarm is benchmarked against single-agent and no-trade baselines"
]},
{section:"Security and accounting",items:[
"Policy engine rejects an excessive allocation",
"Policy engine rejects an unauthorized action",
"Expired and duplicate proposals are rejected",
"Net results are computed from recorded evidence and costs",
"Audit log links each decision to its accounting outcome"
]},
{section:"Governance and NEAR",items:[
"Eligible $GREED balance determines voting weight",
"Discord roles do not grant extra voting power",
"Successful vote changes only a permitted mandate",
"Governance outcomes and any timelock are visible",
"At least one NEAR testnet interaction works, if feasible"
]},
{section:"Submission and demo",items:[
"README contains exact setup and test instructions",
"Threat model and demo runbook are included",
"End-to-end demo works from a clean start",
"Public repository and public X demo post are ready",
"Submission details are reviewed before the one-time submission"
]}]}
{@body const [checked,setChecked] = DIL.useState([])}
<box border radius="xl" padding={3} gap={3}>
  <row align="center" justify="between">
    <title size="lg">Definition of done</title>
    <title size="md" color="secondary">{checked.length}/{tasks.reduce((n,s)=>n+s.items.length,0)}</title>
  </row>
  <box background="surface-tertiary" height="6px" radius="full" clip>
    <box background="#C7FF3D" height="6px" radius="full" width={`${checked.length/tasks.reduce((n,s)=>n+s.items.length,0)*100}%`} />
  </box>
  {#each tasks as section,i}
    <box key={section.section} gap={2}>
      <text weight="medium">{section.section}</text>
      {#each section.items as item,j}
        <checkbox key={item} checked={checked.includes(item)} onChange={v=>setChecked(old=>v?[...old,item]:old.filter(x=>x!==item))}>{item}</checkbox>
      {/each}
    </box>
    {#if i<tasks.length-1}
      <divider color="subtle" />
    {/if}
  {/each}
  <row gap={2}>
    <button block variant="outline" onClick={()=>GenUI.copy(tasks.map(s=>s.section+"\n"+s.items.map(item=>(checked.includes(item)?"[x] ":"[ ] ")+item).join("\n")).join("\n\n"))}><icon name="copy" size="sm" inline /> Copy checklist</button>
    <button block variant="outline" onClick={()=>setChecked([])}>Reset</button>
  </row>
</box>

## 11. The demo that should win attention

Build the demo around a single story rather than a tour of every page.

<box border radius="xl" padding={3} gap={3}>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="vote" size="lg" />
    </box>
    <box flex="1" gap={1}>
      **01 · Holders set the mandate**
      A token-weighted governance vote approves a constrained strategy.
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="brain-circuit" size="lg" />
    </box>
    <box flex="1" gap={1}>
      **02 · Agents disagree**
      Two scouts recommend different actions, and the risk agent identifies a material weakness in one.
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="shield-alert" size="lg" />
    </box>
    <box flex="1" gap={1}>
      **03 · The machine refuses an unsafe action**
      The deterministic policy engine rejects an allocation that violates the risk budget and explains why.
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="calculator" size="lg" />
    </box>
    <box flex="1" gap={1}>
      **04 · The outcome is accounted for**
      A permitted action completes in the chosen environment, and the dashboard records its costs, outcome and evidence.
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="chart-no-axes-combined" size="lg" />
    </box>
    <box flex="1" gap={1}>
      **05 · The benchmark answers the hard question**
      Reviewers see whether the swarm improved the decision relative to a single agent and no-trade baseline.
    </box>
  </row>
</box>

## 12. Final priorities

If development time gets tight, prioritize in this order:

1. **A real end-to-end loop** over more pages.
2. **A working policy engine** over AI-generated security claims.
3. **Reproducible accounting and benchmarks** over impressive but unverified profit numbers.
4. **Meaningful agent disagreement** over a large number of shallow agents.
5. **One clear NEAR integration** over several half-finished integrations.
6. **A reproducible demo and strong README** over late feature additions.

The hardest part is not creating a swarm. It is proving that the swarm improves decisions, that unsafe actions cannot bypass policy, and that the displayed financial result can be independently verified. Make those three properties the center of Greed Machine.

---

If you want, I can:

- Expand build schedule with Nov 9–14 details
- Describe MVP checklist in detail
- Outline frontend UI components and interactions