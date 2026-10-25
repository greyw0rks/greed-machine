use near_sdk::{AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue, env, json_types::U128, near, require, serde_json::{self, json}, store::LookupMap};

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Position { pub principal: U128, pub returned: U128, pub status: String }
#[near(serializers = [json])]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
enum Message { Seed, Deposit { run_id: String } }
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct DemoVault { token: AccountId, treasury: AccountId, sponsor: AccountId, fixture_pool: u128, positions: LookupMap<String, Position>, count: u32 }
#[near]
impl DemoVault {
    #[init]
    #[private]
    pub fn new(token: AccountId, treasury: AccountId, sponsor: AccountId) -> Self { Self { token, treasury, sponsor, fixture_pool: 0, positions: LookupMap::new(b"p"), count: 0 } }
    pub fn get_position(&self, run_id: String) -> Option<Position> { self.positions.get(&run_id).cloned() }
    pub fn get_pool(&self) -> U128 { U128(self.fixture_pool) }
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.token, "Wrong token");
        match serde_json::from_str::<Message>(&msg).expect("Invalid vault message") {
            Message::Seed => { require!(sender_id == self.sponsor && amount.0 > 0 && amount.0 <= 1_000_000_000, "Invalid fixture seed"); self.fixture_pool += amount.0; }
            Message::Deposit { run_id } => {
                require!(sender_id == self.treasury, "Only treasury deposits");
                require!(!run_id.is_empty() && run_id.len() <= 80 && !self.positions.contains_key(&run_id) && self.count < 100, "Invalid or replayed position");
                require!(amount.0 > 0 && amount.0 <= 100_000_000, "Capital cap");
                self.positions.insert(run_id, Position { principal: amount, returned: U128(0), status: "FUNDED".into() }); self.count += 1;
            }
        }
        PromiseOrValue::Value(U128(0))
    }
    pub fn withdraw(&mut self, run_id: String) -> Promise {
        require!(env::predecessor_account_id() == self.treasury, "Only treasury exits");
        let mut p = self.positions.get(&run_id).expect("Unknown position").clone();
        require!(p.status == "FUNDED", "Position already exiting or settled");
        // A sponsor funds this demonstration return. It is not market yield.
        let yield_amount = p.principal.0 / 10;
        require!(self.fixture_pool >= yield_amount, "Fixture return not funded");
        self.fixture_pool -= yield_amount; p.status = "EXITING".into(); p.returned = U128(p.principal.0 + yield_amount);
        self.positions.insert(run_id.clone(), p.clone());
        Promise::new(self.token.clone()).function_call("ft_transfer_call", serde_json::to_vec(&json!({"receiver_id":self.treasury,"amount":p.returned,"msg":serde_json::to_string(&json!({"kind":"settlement","run_id":run_id})).unwrap()})).unwrap(), NearToken::from_yoctonear(1), Gas::from_tgas(65))
            .then(Promise::new(env::current_account_id()).function_call("on_withdraw", serde_json::to_vec(&json!({"run_id":run_id})).unwrap(), NearToken::from_yoctonear(0), Gas::from_tgas(15)))
    }
    #[private]
    pub fn on_withdraw(&mut self, run_id: String) -> Option<bool> {
        let mut p = self.positions.get(&run_id).expect("Unknown position").clone();
        require!(p.status == "EXITING", "Invalid callback state");
        let used = env::promise_result_checked(0,128).ok().and_then(|bytes|serde_json::from_slice::<U128>(&bytes).ok().map(|v|v.0));
        if used == Some(p.returned.0) { p.status = "SETTLED".into(); }
        else if used == Some(0) { self.fixture_pool += p.returned.0 - p.principal.0; p.returned = U128(0); p.status = "FUNDED".into(); }
        else { p.status = "UNCERTAIN".into(); }
        let result = if p.status == "UNCERTAIN" { None } else { Some(p.status == "SETTLED") }; self.positions.insert(run_id, p); result
    }
}
