use near_contract_standards::fungible_token::{FungibleToken, FungibleTokenCore, events::FtMint, metadata::{FungibleTokenMetadata, FungibleTokenMetadataProvider}, resolver::FungibleTokenResolver};
use near_contract_standards::storage_management::{StorageBalance, StorageBalanceBounds, StorageManagement};
use near_sdk::{AccountId, NearToken, PanicOnDefault, PromiseOrValue, json_types::U128, near, require};

/// Fixed-supply demonstration currency. No dollar backing, USDC claim, or mint authority.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct TestDollar { token: FungibleToken, metadata: FungibleTokenMetadata }
#[near]
impl TestDollar {
    #[init]
    #[private]
    pub fn new(owner: AccountId, holders: Option<Vec<(AccountId,U128)>>) -> Self {
        let mut token = FungibleToken::new(b"t".to_vec());
        let greed = holders.is_some();
        let allocations = holders.unwrap_or_else(||vec![(owner,U128(1_000_000_000_000))]);
        if greed { require!(allocations.len() == 3 && allocations.iter().map(|(_,a)|a.0).sum::<u128>() == 1_000_000, "Fixed demo GREED supply"); }
        for (account,amount) in allocations { require!(amount.0 > 0,"Positive allocation required"); token.internal_register_account(&account); token.internal_deposit(&account,amount.0); FtMint { owner_id:&account,amount,memo:Some("Fixed test fixture genesis") }.emit(); }
        Self { token,metadata:FungibleTokenMetadata { spec:"ft-1.0.0".into(),name:if greed {"Greed Business Test Token"} else {"Greed Demo Dollar (unbacked test fixture)"}.into(),symbol:if greed {"GREED"} else {"gUSD"}.into(),icon:None,reference:None,reference_hash:None,decimals:if greed {0} else {6} } }
    }
}
#[near]
impl FungibleTokenCore for TestDollar {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) { self.token.ft_transfer(receiver_id, amount, memo) }
    #[payable]
    fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>, msg: String) -> PromiseOrValue<U128> { self.token.ft_transfer_call(receiver_id, amount, memo, msg) }
    fn ft_total_supply(&self) -> U128 { self.token.ft_total_supply() }
    fn ft_balance_of(&self, account_id: AccountId) -> U128 { self.token.ft_balance_of(account_id) }
}
#[near]
impl FungibleTokenResolver for TestDollar {
    #[private]
    fn ft_resolve_transfer(&mut self, sender_id: AccountId, receiver_id: AccountId, amount: U128) -> U128 { self.token.ft_resolve_transfer(sender_id, receiver_id, amount) }
}
#[near]
impl FungibleTokenMetadataProvider for TestDollar {
    fn ft_metadata(&self) -> FungibleTokenMetadata { self.metadata.clone() }
}
#[near]
impl StorageManagement for TestDollar {
    #[payable]
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>) -> StorageBalance { self.token.storage_deposit(account_id, registration_only) }
    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance { self.token.storage_withdraw(amount) }
    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool { self.token.storage_unregister(force) }
    fn storage_balance_bounds(&self) -> StorageBalanceBounds { self.token.storage_balance_bounds() }
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> { self.token.storage_balance_of(account_id) }
}
