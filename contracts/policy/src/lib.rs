use near_sdk::{AccountId, PanicOnDefault, env, json_types::U64, near, require, store::LookupMap};

const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
const SYNTHETIC_BALANCE: u64 = 100_000_000_000;
const MAX_RECORDS: u64 = 1_000;

#[near(serializers = [borsh, json])]
#[derive(Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Policy {
    pub id: String,
    pub max_spend_micros: U64,
    pub max_exposure_bps: u32,
    pub min_reserve_bps: u32,
    pub paused: bool,
}

#[near(serializers = [json])]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Proposal {
    pub id: String,
    pub venue: String,
    pub contract: String,
    pub amount_micros: U64,
    pub mandate_id: String,
    pub expires_at: U64,
    pub data_observed_at: U64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    pub rule: String,
    pub passed: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct Decision {
    pub proposal_id: String,
    pub allowed: bool,
    pub checks: Vec<Check>,
    pub recorded_at: U64,
    pub policy: Policy,
    pub input_hash: String,
    pub environment: String,
}

#[near(serializers = [json])]
#[serde(rename_all = "camelCase")]
pub struct PolicyView {
    pub schema_version: u32,
    pub purpose: String,
    pub owner: AccountId,
    pub guardian: AccountId,
    pub synthetic_balance_micros: U64,
    pub allowed_venues: Vec<String>,
    pub policy: Policy,
    pub record_count: U64,
}

/// Records decisions about synthetic allocations. Contains no transfer or swap method.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct GreedPolicy {
    owner: AccountId,
    guardian: AccountId,
    policy: Policy,
    records: LookupMap<String, Decision>,
    accepted: LookupMap<String, bool>,
    record_count: u64,
}

#[near]
impl GreedPolicy {
    // Deploy + initialize in one transaction. A third party cannot claim ownership.
    #[init]
    #[private]
    pub fn new(guardian: AccountId) -> Self {
        Self {
            owner: env::current_account_id(),
            guardian,
            policy: Policy {
                id: "mandate-genesis".into(),
                max_spend_micros: U64(25_000_000_000),
                max_exposure_bps: 3500,
                min_reserve_bps: 2500,
                paused: false,
            },
            records: LookupMap::new(b"r"),
            accepted: LookupMap::new(b"a"),
            record_count: 0,
        }
    }

    pub fn get_policy(&self) -> PolicyView {
        PolicyView {
            schema_version: 1,
            purpose: "synthetic-policy-proof".into(),
            owner: self.owner.clone(),
            guardian: self.guardian.clone(),
            synthetic_balance_micros: U64(SYNTHETIC_BALANCE),
            allowed_venues: vec!["lending".into(), "staking".into(), "hold".into()],
            policy: self.policy.clone(),
            record_count: U64(self.record_count),
        }
    }

    pub fn get_record(&self, record_id: String) -> Option<Decision> {
        self.records.get(&record_id).cloned()
    }

    pub fn evaluate(&self, proposal: Proposal) -> Decision {
        self.check(&proposal)
    }

    // Only the isolated operator may spend storage. One record ID cannot be overwritten.
    pub fn record_decision(&mut self, record_id: String, proposal: Proposal) -> Decision {
        self.assert_owner();
        require!(!record_id.is_empty() && record_id.len() <= 100, "Invalid record ID");
        require!(!self.records.contains_key(&record_id), "Record already exists");
        require!(self.record_count < MAX_RECORDS, "Proof record capacity reached");
        let decision = self.check(&proposal);
        if decision.allowed {
            self.accepted.insert(proposal.id.clone(), true);
        }
        self.records.insert(record_id.clone(), decision.clone());
        self.record_count += 1;
        env::log_str(&format!("EVENT_JSON:{}", near_sdk::serde_json::json!({
            "standard": "greed_policy", "version": "1.0.0", "event": "decision_recorded",
            "data": [{ "recordId": record_id, "decision": decision }]
        })));
        decision
    }

    pub fn update_policy(&mut self, id: String, max_spend_micros: U64, max_exposure_bps: u32, min_reserve_bps: u32) {
        self.assert_owner();
        require!(!id.is_empty() && id.len() <= 100, "Invalid mandate ID");
        require!((1_000_000..=25_000_000_000).contains(&max_spend_micros.0), "Spend outside immutable bounds");
        require!((100..=3500).contains(&max_exposure_bps), "Exposure outside immutable bounds");
        require!((2500..=9500).contains(&min_reserve_bps), "Reserve outside immutable bounds");
        // A new ID prevents stale proposals from being accepted after a policy change.
        require!(id != self.policy.id, "Mandate change requires a new ID");
        self.policy = Policy { id, max_spend_micros, max_exposure_bps, min_reserve_bps, paused: self.policy.paused };
    }

    pub fn set_pause(&mut self, paused: bool) {
        require!(env::predecessor_account_id() == self.guardian, "Only guardian may pause or resume");
        self.policy.paused = paused;
    }
}

impl GreedPolicy {
    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "Only operator may perform this action");
    }

    fn check(&self, p: &Proposal) -> Decision {
        require!(!p.id.is_empty() && p.id.len() <= 100, "Invalid proposal ID");
        require!(p.venue.len() <= 32 && p.contract.len() <= 100 && p.mandate_id.len() <= 100, "Input too long");
        let now = env::block_timestamp_ms();
        let hold = p.venue == "hold";
        let amount = p.amount_micros.0;
        let valid_amount = amount <= MAX_SAFE_INTEGER && (!hold || amount == 0);
        let receiver = match p.venue.as_str() {
            "lending" => "sim.lending",
            "staking" => "sim.staking",
            "hold" => "sim.reserve",
            _ => "",
        };
        let amount128 = u128::from(amount);
        let balance128 = u128::from(SYNTHETIC_BALANCE);
        let conditions = [
            ("Contract & action allowlist", !receiver.is_empty() && p.contract == receiver),
            ("Transaction ceiling", valid_amount && amount <= self.policy.max_spend_micros.0),
            ("Exposure limit", valid_amount && amount128 * 10_000 <= balance128 * u128::from(self.policy.max_exposure_bps)),
            ("Reserve floor", valid_amount && amount <= SYNTHETIC_BALANCE && (balance128 - amount128.min(balance128)) * 10_000 >= balance128 * u128::from(self.policy.min_reserve_bps)),
            ("Current mandate & fresh data", p.mandate_id == self.policy.id && (hold || (p.data_observed_at.0 <= now && now - p.data_observed_at.0 <= 300_000))),
            ("Proposal expiry", p.expires_at.0 > now),
            ("Replay protection", !self.accepted.contains_key(&p.id)),
            ("Emergency pause", !self.policy.paused),
        ];
        Decision {
            proposal_id: p.id.clone(),
            allowed: conditions.iter().all(|(_, passed)| *passed),
            checks: conditions.into_iter().map(|(rule, passed)| Check { rule: rule.into(), passed }).collect(),
            recorded_at: U64(now),
            policy: self.policy.clone(),
            input_hash: env::sha256(&near_sdk::serde_json::to_vec(p).unwrap()).iter().map(|b| format!("{b:02x}")).collect(),
            environment: "synthetic-policy-proof".into(),
        }
    }
}
