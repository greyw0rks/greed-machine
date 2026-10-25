use near_sdk::{AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseOrValue, PromiseError, env, json_types::{U128,U64}, near, require, serde_json::{self,json}, store::LookupMap};

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Position { pub principal: U128, pub returned: U128, pub status: String, pub proposal_hash: String }
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Holder { pub account_id: AccountId, pub weight: U128 }
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Entitlement { pub account_id: AccountId, pub amount: U128, pub status: String, pub attempts: u32 }
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Period { pub id: u32, pub snapshot_hash: String, pub holders: Vec<Holder>, pub profit: U128, pub holder_amount: U128, pub retained: U128, pub entitlements: Vec<Entitlement> }
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Expense { pub amount: U128, pub evidence_hash: String, pub status: String }
#[near(serializers = [json])]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
enum Funding { Launch { receipt_id: String }, Fee { receipt_id: String }, Settlement { run_id: String } }

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Business {
    token: AccountId, vault: AccountId, sponsor: AccountId, operator: AccountId, guardian: AccountId, expense_receiver: AccountId, roster: Vec<AccountId>,
    cash: u128, principal: u128, reserved: u128, net: i128, watermark: u128, paid: u128, liabilities: u128, expense_pending: u128,
    expense_budget_used: u128, paused: bool, active: Option<String>, positions: LookupMap<String,Position>, expenses: LookupMap<String,Expense>, receipts: LookupMap<String,U128>,
    periods: Vec<Period>, operations: u32, next_distribution_ns: u64, cadence_ns: u64,
}
fn valid_id(id: &str) { require!(!id.is_empty() && id.len() <= 80 && id.bytes().all(|b|b.is_ascii_alphanumeric() || b"._:-".contains(&b)), "Invalid operation ID"); }
fn valid_hash(h: &str) { require!(h.len() == 64 && h.bytes().all(|b|b.is_ascii_digit() || (b'a'..=b'f').contains(&b)), "A SHA-256 commitment is required"); }
fn emit(event: &str, data: serde_json::Value) { env::log_str(&format!("EVENT_JSON:{}",json!({"standard":"greed_business","version":"1.0.0","event":event,"data":[data]}))); }
fn call(receiver: AccountId, method: &str, args: serde_json::Value, gas: u64, deposit: u128) -> Promise { Promise::new(receiver).function_call(method,serde_json::to_vec(&args).unwrap(),NearToken::from_yoctonear(deposit),Gas::from_tgas(gas)) }
#[near]
impl Business {
    #[init]
    #[private]
    pub fn new(token: AccountId, vault: AccountId, sponsor: AccountId, operator: AccountId, guardian: AccountId, expense_receiver: AccountId, roster: Vec<AccountId>, cadence_seconds: u32) -> Self {
        require!([&token,&vault,&sponsor,&operator,&guardian,&expense_receiver,&env::current_account_id()].iter().all(|a|a.as_str().ends_with(".testnet")), "Testnet accounts only");
        require!(operator != guardian && operator != env::current_account_id() && guardian != env::current_account_id(), "Separate authorities required");
        require!(!roster.is_empty() && roster.len() <= 8 && (1..=86400).contains(&cadence_seconds), "Invalid demo cadence or roster");
        for (i,a) in roster.iter().enumerate() { require!(a.as_str().ends_with(".testnet") && a != &env::current_account_id() && a != &vault && !roster[..i].contains(a), "Invalid immutable recipient roster"); }
        let cadence_ns = u64::from(cadence_seconds)*1_000_000_000;
        Self { token,vault,sponsor,operator,guardian,expense_receiver,roster,cash:0,principal:0,reserved:0,net:0,watermark:0,paid:0,liabilities:0,expense_pending:0,expense_budget_used:0,paused:false,active:None,positions:LookupMap::new(b"p"),expenses:LookupMap::new(b"e"),receipts:LookupMap::new(b"r"),periods:vec![],operations:0,next_distribution_ns:env::block_timestamp()+cadence_ns,cadence_ns }
    }
    pub fn get_state(&self) -> serde_json::Value { json!({"schema_version":1,"environment":"testnet-demo-token","token":self.token,"vault":self.vault,"sponsor":self.sponsor,"operator":self.operator,"guardian":self.guardian,"expense_receiver":self.expense_receiver,"roster":self.roster,"cash":U128(self.cash),"principal":U128(self.principal),"reserved":U128(self.reserved),"net":self.net.to_string(),"watermark":U128(self.watermark),"paid":U128(self.paid),"liabilities":U128(self.liabilities),"expense_pending":U128(self.expense_pending),"expense_budget_used":U128(self.expense_budget_used),"expense_budget":U128(10_000_000),"reserve_floor":U128(self.principal.div_ceil(4)),"max_spend":U128(100_000_000),"holder_bps":6500,"cadence_ns":U64(self.cadence_ns),"next_distribution_ns":U64(self.next_distribution_ns),"paused":self.paused,"active":self.active,"period_count":self.periods.len()}) }
    pub fn get_position(&self, run_id: String) -> Option<Position> { self.positions.get(&run_id).cloned() }
    pub fn get_expense(&self, receipt_id: String) -> Option<Expense> { self.expenses.get(&receipt_id).cloned() }
    pub fn get_funding(&self, receipt_id: String) -> Option<U128> { self.receipts.get(&receipt_id).copied() }
    pub fn get_period(&self, period_id: u32) -> Option<Period> { self.periods.get(period_id as usize).cloned() }
    pub fn set_pause(&mut self, paused: bool) { require!(env::predecessor_account_id() == self.guardian, "Guardian only"); self.paused=paused; emit("pause",json!({"paused":paused})); }
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        require!(env::predecessor_account_id() == self.token && amount.0 > 0 && amount.0 <= 10_000_000_000, "Invalid token or amount");
        match serde_json::from_str::<Funding>(&msg).expect("Invalid funding message") {
            Funding::Launch { receipt_id } | Funding::Fee { receipt_id } => {
                require!(sender_id == self.sponsor && !self.paused, "Funding sponsor only; not paused"); valid_id(&receipt_id);
                require!(!self.receipts.contains_key(&receipt_id), "Funding receipt replay"); self.consume_storage();
                let launch = matches!(serde_json::from_str::<Funding>(&msg).unwrap(),Funding::Launch{..});
                if launch { require!(self.principal == 0 && self.active.is_none(), "Launch principal already funded"); self.principal=amount.0; }
                else { require!(self.principal > 0 && amount.0 <= 1_000_000_000, "Invalid project fee"); self.net+=amount.0 as i128; }
                self.cash+=amount.0; self.receipts.insert(receipt_id.clone(),amount);
                emit("funding",json!({"receipt_id":receipt_id,"kind":if launch {"launch"} else {"fee"},"sender_id":sender_id,"amount":amount,"fixture":true}));
            }
            Funding::Settlement { run_id } => {
                require!(sender_id == self.vault && self.active.as_ref() == Some(&run_id), "Wrong settlement source");
                let mut p=self.positions.get(&run_id).expect("Unknown position").clone();
                require!(p.status == "EXITING" && amount.0 <= p.principal.0*2, "Invalid settlement state or return");
                self.cash+=amount.0; self.reserved-=p.principal.0; self.net+=amount.0 as i128-p.principal.0 as i128;
                p.returned=amount; p.status="SETTLED".into(); self.positions.insert(run_id.clone(),p.clone()); self.active=None;
                emit("settlement",json!({"run_id":run_id,"principal":p.principal,"returned":amount,"net":(amount.0 as i128-p.principal.0 as i128).to_string(),"fixture_return":true}));
            }
        }
        PromiseOrValue::Value(U128(0))
    }
    pub fn execute(&mut self, run_id: String, receiver_id: AccountId, amount: U128, expires_at_ms: U64, observed_at_ms: U64, proposal_hash: String) -> Promise {
        self.authorize(); valid_id(&run_id); valid_hash(&proposal_hash); require!(self.active.is_none() && self.expense_pending == 0, "Another operation is unresolved");
        require!(receiver_id == self.vault && amount.0 > 0 && amount.0 <= 100_000_000, "Adapter or capital cap");
        let now=env::block_timestamp_ms(); require!(now < expires_at_ms.0 && expires_at_ms.0 <= now+300_000 && observed_at_ms.0 <= now+30_000 && observed_at_ms.0.saturating_add(60_000) >= now, "Expired proposal or stale data");
        require!(!self.positions.contains_key(&run_id), "Run replay"); require!(self.available() >= self.principal.div_ceil(4)+amount.0, "Reserve or holder liabilities"); self.consume_storage();
        self.cash-=amount.0; self.reserved+=amount.0; self.active=Some(run_id.clone());
        self.positions.insert(run_id.clone(),Position { principal:amount,returned:U128(0),status:"FUNDING".into(),proposal_hash:proposal_hash.clone() });
        emit("execution",json!({"run_id":run_id,"amount":amount,"receiver_id":receiver_id,"proposal_hash":proposal_hash}));
        call(self.token.clone(),"ft_transfer_call",json!({"receiver_id":receiver_id,"amount":amount,"msg":serde_json::to_string(&json!({"kind":"deposit","run_id":run_id})).unwrap()}),65,1)
            .then(call(env::current_account_id(),"on_execute",json!({"run_id":run_id}),15,0))
    }
    #[private]
    pub fn on_execute(&mut self, run_id: String) -> bool {
        let mut p=self.positions.get(&run_id).expect("Unknown position").clone(); require!(p.status == "FUNDING", "Invalid callback state");
        let used=env::promise_result_checked(0,128).ok().and_then(|bytes|serde_json::from_slice::<U128>(&bytes).ok().map(|v|v.0));
        if used == Some(p.principal.0) { p.status="FUNDED".into(); }
        else if used == Some(0) { self.cash+=p.principal.0; self.reserved-=p.principal.0; self.active=None; p.status="FAILED".into(); }
        else { p.status="UNCERTAIN".into(); }
        let funded=p.status == "FUNDED"; self.positions.insert(run_id.clone(),p.clone()); emit("execution_result",json!({"run_id":run_id,"status":p.status})); funded
    }
    pub fn exit(&mut self, run_id: String) -> Promise {
        self.assert_operator(); require!(self.active.as_ref() == Some(&run_id), "Unknown active run");
        let mut p=self.positions.get(&run_id).expect("Unknown position").clone(); require!(p.status == "FUNDED", "Position not funded or already exiting"); p.status="EXITING".into(); self.positions.insert(run_id.clone(),p);
        call(self.vault.clone(),"withdraw",json!({"run_id":run_id}),125,0).then(call(env::current_account_id(),"on_exit",json!({"run_id":run_id}),15,0))
    }
    #[private]
    pub fn on_exit(&mut self, run_id: String) -> bool {
        let mut p=self.positions.get(&run_id).expect("Unknown position").clone();
        if p.status == "SETTLED" { return true; }
        require!(p.status == "EXITING", "Invalid callback state");
        let rejected=env::promise_result_checked(0,128).ok().and_then(|bytes|serde_json::from_slice::<bool>(&bytes).ok()) == Some(false);
        p.status=if rejected {"FUNDED"} else {"UNCERTAIN"}.into(); self.positions.insert(run_id,p); false
    }
    pub fn pay_expense(&mut self, receipt_id: String, amount: U128, evidence_hash: String) -> Promise {
        self.authorize(); valid_id(&receipt_id); valid_hash(&evidence_hash);
        require!(!self.expenses.contains_key(&receipt_id) && amount.0 > 0 && self.active.is_none(), "Expense replay or active position");
        require!(self.expense_budget_used+amount.0 <= 10_000_000 && self.available() >= self.principal.div_ceil(4)+amount.0, "Expense budget, reserves or liabilities"); self.consume_storage();
        self.expense_budget_used+=amount.0; self.expense_pending+=amount.0; self.expenses.insert(receipt_id.clone(),Expense { amount,evidence_hash,status:"SENDING".into() });
        call(self.token.clone(),"ft_transfer",json!({"receiver_id":self.expense_receiver,"amount":amount,"memo":receipt_id}),20,1).then(call(env::current_account_id(),"on_expense",json!({"receipt_id":receipt_id}),15,0))
    }
    #[private]
    pub fn on_expense(&mut self, receipt_id: String) -> bool {
        let mut e=self.expenses.get(&receipt_id).expect("Unknown expense").clone(); require!(e.status == "SENDING", "Expense callback replay");
        let result=env::promise_result_checked(0,0); if matches!(result,Err(PromiseError::TooLong(_))) { return false; }
        let ok=result.is_ok(); self.expense_pending-=e.amount.0;
        if ok { self.cash-=e.amount.0; self.net-=e.amount.0 as i128; e.status="PAID".into(); }
        else { self.expense_budget_used-=e.amount.0; e.status="FAILED".into(); }
        self.expenses.insert(receipt_id.clone(),e.clone()); emit("expense",json!({"receipt_id":receipt_id,"receiver_id":self.expense_receiver,"amount":e.amount,"evidence_hash":e.evidence_hash,"status":e.status})); ok
    }
    pub fn freeze(&mut self, snapshot_hash: String, holders: Vec<Holder>) -> Period {
        self.authorize(); valid_hash(&snapshot_hash); require!(self.active.is_none() && self.expense_pending == 0 && self.periods.len() < 100, "Unresolved operation or period cap");
        require!(env::block_timestamp() >= self.next_distribution_ns, "Distribution period not due");
        require!(holders.len() == self.roster.len(), "Snapshot must cover immutable eligible roster");
        let mut sorted=holders.clone(); sorted.sort_by(|a,b|a.account_id.cmp(&b.account_id));
        for (i,h) in sorted.iter().enumerate() { require!(self.roster.contains(&h.account_id) && h.weight.0 > 0 && h.weight.0 <= 1_000_000 && (i == 0 || sorted[i-1].account_id != h.account_id), "Invalid holder weights or duplicates"); }
        let profit=(self.net.max(0) as u128).saturating_sub(self.watermark); require!(profit > 0, "No realized profit beyond loss recovery");
        let pool=profit*6500/10_000; require!(self.available() >= self.principal.div_ceil(4)+pool, "Reserve prevents distribution");
        let total=sorted.iter().map(|h|h.weight.0).sum::<u128>();
        let mut rows:Vec<(Holder,u128,u128)>=sorted.into_iter().map(|h| { let amount=pool*h.weight.0/total; let remainder=pool*h.weight.0%total; (h,amount,remainder) }).collect();
        let mut remaining=pool-rows.iter().map(|r|r.1).sum::<u128>(); let mut indices:Vec<usize>=(0..rows.len()).collect();
        indices.sort_by(|a,b|rows[*b].2.cmp(&rows[*a].2).then_with(||rows[*a].0.account_id.cmp(&rows[*b].0.account_id)));
        for i in indices { if remaining == 0 { break; } rows[i].1+=1; remaining-=1; }
        let p=Period { id:self.periods.len() as u32,snapshot_hash,holders,profit:U128(profit),holder_amount:U128(pool),retained:U128(profit-pool),entitlements:rows.into_iter().map(|(h,amount,_)|Entitlement { account_id:h.account_id,amount:U128(amount),status:if amount == 0 {"PAID"} else {"PENDING"}.into(),attempts:0 }).collect() };
        self.watermark=self.net as u128; self.liabilities+=pool; self.next_distribution_ns=env::block_timestamp()+self.cadence_ns; self.expense_budget_used=0; self.periods.push(p.clone()); emit("distribution",json!(p)); p
    }
    pub fn pay(&mut self, period_id: u32, account_id: AccountId) -> Promise {
        self.authorize(); require!(self.available() >= self.principal.div_ceil(4), "Liquid reserve prevents payout"); let p=self.periods.get_mut(period_id as usize).expect("Unknown period");
        let e=p.entitlements.iter_mut().find(|e|e.account_id == account_id).expect("Not a period recipient");
        require!(e.status == "PENDING" || e.status == "FAILED", "Payout paid or unresolved"); require!(e.attempts < 20, "Retry cap"); e.status="SENDING".into(); e.attempts+=1; let amount=e.amount;
        call(self.token.clone(),"ft_transfer",json!({"receiver_id":account_id,"amount":amount,"memo":format!("greed-period-{period_id}")}),20,1).then(call(env::current_account_id(),"on_pay",json!({"period_id":period_id,"account_id":account_id}),15,0))
    }
    #[private]
    pub fn on_pay(&mut self, period_id: u32, account_id: AccountId) -> bool {
        let p=self.periods.get_mut(period_id as usize).expect("Unknown period"); let e=p.entitlements.iter_mut().find(|e|e.account_id == account_id).expect("Unknown recipient"); require!(e.status == "SENDING", "Payout callback replay");
        let result=env::promise_result_checked(0,0); if matches!(result,Err(PromiseError::TooLong(_))) { return false; }
        let ok=result.is_ok();
        if ok { self.cash-=e.amount.0; self.liabilities-=e.amount.0; self.paid+=e.amount.0; e.status="PAID".into(); } else { e.status="FAILED".into(); }
        emit("payout",json!({"period_id":period_id,"account_id":account_id,"amount":e.amount,"status":e.status,"attempts":e.attempts})); ok
    }
}
impl Business {
    fn assert_operator(&self) { require!(env::predecessor_account_id() == self.operator, "Operator only"); }
    fn authorize(&self) { self.assert_operator(); require!(!self.paused, "Treasury paused"); }
    fn available(&self) -> u128 { self.cash.saturating_sub(self.liabilities+self.expense_pending) }
    fn consume_storage(&mut self) { require!(self.operations < 100, "Demo storage cap"); self.operations+=1; }
}
