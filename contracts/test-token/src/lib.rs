use near_contract_standards::fungible_token::{
    FungibleToken, FungibleTokenCore,
    metadata::{FungibleTokenMetadata, FungibleTokenMetadataProvider},
    resolver::FungibleTokenResolver,
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::{
    AccountId, NearToken, PanicOnDefault, PromiseOrValue, json_types::U128, near, require,
};

/// NEP-141 testnet fixture. No mint authority exists after initialization.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct GreedTestToken {
    token: FungibleToken,
    metadata: FungibleTokenMetadata,
}

#[near]
impl GreedTestToken {
    #[init]
    #[private]
    pub fn new(holders: Vec<(AccountId, U128)>) -> Self {
        require!(holders.len() == 3, "Test fixture requires three holders");
        require!(
            holders.iter().map(|(_, amount)| amount.0).sum::<u128>() == 1_000_000,
            "Test supply must be one million"
        );
        let mut token = FungibleToken::new(b"t".to_vec());
        for (account, amount) in holders {
            token.internal_register_account(&account);
            token.internal_deposit(&account, amount.0);
        }
        Self {
            token,
            metadata: FungibleTokenMetadata {
                spec: "ft-1.0.0".into(),
                name: "Greed Machine Testnet".into(),
                symbol: "GREED".into(),
                icon: None,
                reference: None,
                reference_hash: None,
                decimals: 0,
            },
        }
    }
}
#[near]
impl FungibleTokenCore for GreedTestToken {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.token.ft_transfer(receiver_id, amount, memo)
    }
    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }
    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }
    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}
#[near]
impl FungibleTokenResolver for GreedTestToken {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        self.token
            .ft_resolve_transfer(sender_id, receiver_id, amount)
    }
}
#[near]
impl FungibleTokenMetadataProvider for GreedTestToken {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        self.metadata.clone()
    }
}
#[near]
impl StorageManagement for GreedTestToken {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }
    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }
    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        self.token.storage_unregister(force)
    }
    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}
