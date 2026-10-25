# NEAR policy proof

The NEAR milestone adds a Rust contract that evaluates and records decisions about synthetic allocations. Treasury settlement and holder governance remain simulated.

The verified public account is `greed-policy-8a07c217.testnet`. Deployment and record transaction hashes are in [testnet evidence](../evidence/near-testnet.json). The deployed code hash is `44XiT4dS4JYGCfa3Gb3axZKuD6XckA4VMYNyaKzfWMKN`.

## Contract

`contracts/policy` pins stable NEAR SDK 5.29.1 and requires Rust 1.93 or newer.

| Method | Access | Behavior |
| --- | --- | --- |
| `new` | Contract account, once | Initializes operator, separate guardian, and genesis policy |
| `get_policy` | Public view | Returns versioned policy, synthetic principal, and record count |
| `evaluate` | Public view | Computes eight checks using chain time and accepted IDs |
| `record_decision` | Operator | Stores a decision and SHA-256 input commitment; consumes accepted proposal IDs |
| `get_record` | Public view | Reads an immutable record by ID |
| `update_policy` | Operator | Changes three limits within immutable bounds |
| `set_pause` | Guardian | Pauses or resumes decisions |

The contract uses a fixed 100,000 synthetic USDC reference balance and the app's `sim.lending`, `sim.staking`, and `sim.reserve` allowlist. These strings identify fixtures. Accepted records consume proposal IDs but deploy no capital. The contract has no transfer or swap method.

The operator supplies synthetic scenario inputs. Timestamp validation does not establish the truth of market data. The proof demonstrates the contract's decision for the submitted inputs. Operator mandate changes are demonstrations, not holder votes.

Amounts and timestamps use decimal strings on the wire; arithmetic uses `u128` intermediates. Records cannot be overwritten and storage is capped at 1,000 records. Rejected attempts retain evidence without consuming a proposal ID.

## Local verification

Install Rust 1.93 or newer and the `wasm32-unknown-unknown` target, then:

```bash
npm ci
npm run contract:build
npm run contract:check
npm run verify
```

`contract:check` starts NEAR Sandbox 2.13.4 and deploys the compiled WebAssembly. Its 16 checks cover TypeScript/WASM parity, adversarial proposals, stale and future data, oversized integers, persisted commitments, replay protection, guardian privileges, and immutable limits. Results are saved to `evidence/near-sandbox.json`.

The sandbox downloads its official binary under the OS temporary directory to avoid cross-filesystem rename failures. Startup has a 60-second timeout and needs permission to bind local sockets.

## Public testnet proof

```bash
npm run near:plan
npm run near:deploy
npm run near:verify
```

`near:plan` generates dedicated operator and guardian keys locally and prints the account, build hash, and intended operations. It performs no blockchain writes. Credentials use mode `0600` in ignored `.near/proof-credentials.json`. Preserve that file to control the account; never commit it.

`near:deploy` funds the fresh account through the testnet faucet, deploys and initializes atomically, creates its guardian subaccount with 0.2 testnet NEAR, then records a permitted allocation, an unauthorized receiver, and a replay. It checks testnet before signing, waits for full finality, refuses to overwrite a different contract, and checks recorded results against TypeScript. Only faucet-funded testnet NEAR is used. Faucet failures report the account and public key needed to continue.

`near:verify` reads the existing deployment. `evidence/near-testnet.json` contains transaction hashes, code hash, recorded checks, and finalized block observations. A completed report is written only after all three cases verify; interrupted deployments leave `completed: false` checkpoints.

Copy the four public settings from `.near/app.env` into `.env.local`, preserving existing values, and restart the app. In Overview, select **Verify testnet**, inspect the checks, and export the observation. Set `NEAR_PROOF_RECORD_ID=blocked` or `replay` to inspect the other cases.

## Verification boundary

The app checks testnet status, contract schema and immutable limits, compares deployed code with `NEAR_POLICY_CODE_HASH`, and reads policy and record at the same finalized block. An unconfigured build hash is explicitly labeled. Without a contract account, only network connectivity is reported.

RPC observations trust the configured service; they are not light-client consensus proofs. Chain records remain separate from the simulation audit and ledger. There is no wallet authentication, real token snapshot, or treasury execution on NEAR in this milestone.

Wallet signature authentication and token snapshot voting are now implemented, with a configured public testnet token; see [wallet governance](wallet-governance.md). Following the business-model revision, governance is reserved for core changes. The next priority is the autonomous operating loop and profit-distribution accounting; see [business model](business-model.md).
