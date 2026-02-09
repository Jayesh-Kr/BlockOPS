//!
//! Stylus ERC721 NFT Contract
//!
//! A complete ERC721 NFT implementation in Stylus.
//! This contract allows users to deploy their own NFT collections with custom:
//! - Name
//! - Symbol
//! - Base URI for metadata
//!
//! The program is ABI-equivalent with Solidity ERC721.
//! To export the ABI, run `cargo stylus export-abi`.
//!
//! Note: this code is a template and has not been audited.
//!
// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

extern crate alloc;

use alloc::{string::{String, ToString}, vec, vec::Vec};
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::{sol, SolError},
    prelude::*,
};

// Define the ERC721 NFT storage
sol_storage! {
    #[entrypoint]
    pub struct Erc721 {
        string name;
        string symbol;
        string base_uri;
        uint256 next_token_id;
        
        mapping(uint256 => address) owners;
        mapping(address => uint256) balances;
        mapping(uint256 => address) token_approvals;
        mapping(address => mapping(address => bool)) operator_approvals;
    }
}

// ERC721 Events
sol! {
    event Transfer(address indexed from, address indexed to, uint256 indexed token_id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed token_id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
}

// Custom errors
sol! {
    error InvalidTokenId(uint256 token_id);
    error NotOwnerOrApproved(address caller, uint256 token_id);
    error InvalidRecipient(address to);
    error TokenAlreadyMinted(uint256 token_id);
    error NotOwner(address caller, uint256 token_id);
    error MintToZeroAddress();
    error TransferToZeroAddress();
}

#[public]
impl Erc721 {
    /// Initializes the NFT collection with name, symbol, and base URI
    /// This should be called right after deployment
    pub fn initialize(
        &mut self,
        name: String,
        symbol: String,
        base_uri: String,
    ) {
        // Only initialize once
        if !self.name.get_string().is_empty() {
            return;
        }

        self.name.set_str(&name);
        self.symbol.set_str(&symbol);
        self.base_uri.set_str(&base_uri);
        self.next_token_id.set(U256::from(1)); // Start token IDs from 1
    }

    /// Returns the name of the NFT collection
    pub fn name(&self) -> String {
        self.name.get_string()
    }

    /// Returns the symbol of the NFT collection
    pub fn symbol(&self) -> String {
        self.symbol.get_string()
    }

    /// Returns the base URI for token metadata
    pub fn base_uri(&self) -> String {
        self.base_uri.get_string()
    }

    /// Returns the token URI for a given token ID
    pub fn token_uri(&self, token_id: U256) -> Result<String, Vec<u8>> {
        if !self._exists(token_id) {
            return Err(InvalidTokenId { token_id }.abi_encode());
        }
        
        let base = self.base_uri.get_string();
        let id_str = token_id.to_string();
        Ok(alloc::format!("{}{}", base, id_str))
    }

    /// Returns the total number of tokens minted
    pub fn total_supply(&self) -> U256 {
        let next_id = self.next_token_id.get();
        if next_id > U256::ZERO {
            next_id - U256::from(1)
        } else {
            U256::ZERO
        }
    }

    /// Returns the balance (number of NFTs) of an account
    pub fn balance_of(&self, owner: Address) -> U256 {
        self.balances.get(owner)
    }

    /// Returns the owner of a token
    pub fn owner_of(&self, token_id: U256) -> Result<Address, Vec<u8>> {
        let owner = self.owners.get(token_id);
        if owner == Address::ZERO {
            return Err(InvalidTokenId { token_id }.abi_encode());
        }
        Ok(owner)
    }

    /// Mints a new NFT to the specified address
    pub fn mint(&mut self, to: Address) -> Result<U256, Vec<u8>> {
        if to == Address::ZERO {
            return Err(MintToZeroAddress {}.abi_encode());
        }

        let token_id = self.next_token_id.get();
        self.next_token_id.set(token_id + U256::from(1));

        self.owners.setter(token_id).set(to);
        
        let balance = self.balances.get(to);
        self.balances.setter(to).set(balance + U256::from(1));

        log(self.vm(), Transfer {
            from: Address::ZERO,
            to,
            token_id,
        });

        Ok(token_id)
    }

    /// Burns (destroys) an NFT
    pub fn burn(&mut self, token_id: U256) -> Result<bool, Vec<u8>> {
        let owner = self.owner_of(token_id)?;
        let caller = self.vm().msg_sender();

        if !self._is_approved_or_owner(caller, token_id) {
            return Err(NotOwnerOrApproved { caller, token_id }.abi_encode());
        }

        // Clear approvals
        self.token_approvals.setter(token_id).set(Address::ZERO);

        // Update balances
        let balance = self.balances.get(owner);
        self.balances.setter(owner).set(balance - U256::from(1));

        // Remove owner
        self.owners.setter(token_id).set(Address::ZERO);

        log(self.vm(), Transfer {
            from: owner,
            to: Address::ZERO,
            token_id,
        });

        Ok(true)
    }

    /// Transfers an NFT from the caller to another address
    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<bool, Vec<u8>> {
        let caller = self.vm().msg_sender();
        
        if !self._is_approved_or_owner(caller, token_id) {
            return Err(NotOwnerOrApproved { caller, token_id }.abi_encode());
        }

        self._transfer(from, to, token_id)?;
        Ok(true)
    }

    /// Safe transfer with data
    pub fn safe_transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<bool, Vec<u8>> {
        self.transfer_from(from, to, token_id)
    }

    /// Approves another address to transfer a specific token
    pub fn approve(&mut self, to: Address, token_id: U256) -> Result<bool, Vec<u8>> {
        let owner = self.owner_of(token_id)?;
        let caller = self.vm().msg_sender();

        if caller != owner && !self.is_approved_for_all(owner, caller) {
            return Err(NotOwner { caller, token_id }.abi_encode());
        }

        self.token_approvals.setter(token_id).set(to);

        log(self.vm(), Approval {
            owner,
            approved: to,
            token_id,
        });

        Ok(true)
    }

    /// Returns the approved address for a token
    pub fn get_approved(&self, token_id: U256) -> Result<Address, Vec<u8>> {
        if !self._exists(token_id) {
            return Err(InvalidTokenId { token_id }.abi_encode());
        }
        Ok(self.token_approvals.get(token_id))
    }

    /// Sets approval for all tokens to an operator
    pub fn set_approval_for_all(&mut self, operator: Address, approved: bool) -> Result<bool, Vec<u8>> {
        let owner = self.vm().msg_sender();
        self.operator_approvals.setter(owner).setter(operator).set(approved);

        log(self.vm(), ApprovalForAll {
            owner,
            operator,
            approved,
        });

        Ok(true)
    }

    /// Checks if an operator is approved for all tokens of an owner
    pub fn is_approved_for_all(&self, owner: Address, operator: Address) -> bool {
        self.operator_approvals.getter(owner).get(operator)
    }
}

// Internal helper functions
impl Erc721 {
    /// Checks if a token exists
    fn _exists(&self, token_id: U256) -> bool {
        self.owners.get(token_id) != Address::ZERO
    }

    /// Checks if the caller is the owner or approved for a token
    fn _is_approved_or_owner(&self, spender: Address, token_id: U256) -> bool {
        if !self._exists(token_id) {
            return false;
        }

        let owner = self.owners.get(token_id);
        
        if spender == owner {
            return true;
        }

        if self.token_approvals.get(token_id) == spender {
            return true;
        }

        if self.operator_approvals.getter(owner).get(spender) {
            return true;
        }

        false
    }

    /// Internal transfer function
    fn _transfer(&mut self, from: Address, to: Address, token_id: U256) -> Result<(), Vec<u8>> {
        if to == Address::ZERO {
            return Err(TransferToZeroAddress {}.abi_encode());
        }

        let owner = self.owner_of(token_id)?;
        if owner != from {
            return Err(NotOwner { caller: from, token_id }.abi_encode());
        }

        // Clear approvals
        self.token_approvals.setter(token_id).set(Address::ZERO);

        // Update balances
        let from_balance = self.balances.get(from);
        self.balances.setter(from).set(from_balance - U256::from(1));

        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + U256::from(1));

        // Transfer ownership
        self.owners.setter(token_id).set(to);

        log(self.vm(), Transfer { from, to, token_id });

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::testing::*;

    #[test]
    fn test_initialization() {
        let vm = TestVM::default();
        let mut nft = Erc721::from(&vm);

        nft.initialize(
            String::from("MyNFT"),
            String::from("MNFT"),
            String::from("https://example.com/metadata/"),
        );

        assert_eq!(nft.name(), "MyNFT");
        assert_eq!(nft.symbol(), "MNFT");
        assert_eq!(nft.base_uri(), "https://example.com/metadata/");
        assert_eq!(nft.total_supply(), U256::ZERO);
    }

    #[test]
    fn test_mint() {
        let vm = TestVM::default();
        let mut nft = Erc721::from(&vm);

        nft.initialize(
            String::from("Test"),
            String::from("TST"),
            String::from("https://test.com/"),
        );

        let recipient = Address::from([1u8; 20]);
        let token_id = nft.mint(recipient).unwrap();
        
        assert_eq!(token_id, U256::from(1));
        assert_eq!(nft.owner_of(token_id).unwrap(), recipient);
        assert_eq!(nft.balance_of(recipient), U256::from(1));
        assert_eq!(nft.total_supply(), U256::from(1));
    }

    #[test]
    fn test_transfer() {
        let vm = TestVM::default();
        let mut nft = Erc721::from(&vm);

        nft.initialize(
            String::from("Test"),
            String::from("TST"),
            String::from("https://test.com/"),
        );

        let owner = vm.msg_sender();
        let token_id = nft.mint(owner).unwrap();
        
        let recipient = Address::from([2u8; 20]);
        assert!(nft.transfer_from(owner, recipient, token_id).is_ok());
        assert_eq!(nft.owner_of(token_id).unwrap(), recipient);
        assert_eq!(nft.balance_of(recipient), U256::from(1));
        assert_eq!(nft.balance_of(owner), U256::ZERO);
    }

    #[test]
    fn test_approve() {
        let vm = TestVM::default();
        let mut nft = Erc721::from(&vm);

        nft.initialize(
            String::from("Test"),
            String::from("TST"),
            String::from("https://test.com/"),
        );

        let owner = vm.msg_sender();
        let token_id = nft.mint(owner).unwrap();
        
        let approved = Address::from([3u8; 20]);
        assert!(nft.approve(approved, token_id).is_ok());
        assert_eq!(nft.get_approved(token_id).unwrap(), approved);
    }

    #[test]
    fn test_burn() {
        let vm = TestVM::default();
        let mut nft = Erc721::from(&vm);

        nft.initialize(
            String::from("Test"),
            String::from("TST"),
            String::from("https://test.com/"),
        );

        let owner = vm.msg_sender();
        let token_id = nft.mint(owner).unwrap();
        
        assert!(nft.burn(token_id).is_ok());
        assert_eq!(nft.balance_of(owner), U256::ZERO);
        assert!(nft.owner_of(token_id).is_err());
    }
}
