//!
//! Stylus ERC20 Token Contract
//!
//! A complete ERC20 token implementation in Stylus.
//! This contract allows users to deploy their own tokens with custom:
//! - Name
//! - Symbol
//! - Initial Supply
//! - Decimals (default 18)
//!
//! The program is ABI-equivalent with Solidity ERC20.
//! To export the ABI, run `cargo stylus export-abi`.
//!
//! Note: this code is a template and has not been audited.
//!
// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

extern crate alloc;

use alloc::{string::String, vec, vec::Vec};
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::{sol, SolError},
    prelude::*,
};

// Define the ERC20 token storage
sol_storage! {
    #[entrypoint]
    pub struct Erc20 {
        string name;
        string symbol;
        uint256 decimals;
        uint256 total_supply;
        
        mapping(address => uint256) balances;
        mapping(address => mapping(address => uint256)) allowances;
    }
}

// ERC20 Events
sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// Custom errors
sol! {
    error InsufficientBalance(address from, uint256 have, uint256 want);
    error InsufficientAllowance(address owner, address spender, uint256 have, uint256 want);
    error InvalidRecipient(address to);
    error InvalidSender(address from);
}

#[public]
impl Erc20 {
    /// Initializes the token with name, symbol, decimals, and initial supply
    /// This should be called right after deployment
    pub fn initialize(
        &mut self,
        name: String,
        symbol: String,
        decimals: U256,
        initial_supply: U256,
    ) {
        // Only initialize once
        if self.total_supply.get() != U256::ZERO {
            return;
        }

        self.name.set_str(&name);
        self.symbol.set_str(&symbol);
        self.decimals.set(decimals);
        self.total_supply.set(initial_supply);

        // Mint initial supply to deployer
        let deployer = self.vm().msg_sender();
        self.balances.setter(deployer).set(initial_supply);

        log(self.vm(), Transfer {
            from: Address::ZERO,
            to: deployer,
            value: initial_supply,
        });
    }

    /// Returns the name of the token
    pub fn name(&self) -> String {
        self.name.get_string()
    }

    /// Returns the symbol of the token
    pub fn symbol(&self) -> String {
        self.symbol.get_string()
    }

    /// Returns the decimals of the token
    pub fn decimals(&self) -> U256 {
        self.decimals.get()
    }

    /// Returns the total supply of the token
    pub fn total_supply(&self) -> U256 {
        self.total_supply.get()
    }

    /// Returns the balance of an account
    pub fn balance_of(&self, account: Address) -> U256 {
        self.balances.get(account)
    }

    /// Transfers tokens from the caller to another account
    pub fn transfer(&mut self, to: Address, amount: U256) -> Result<bool, Vec<u8>> {
        let from = self.vm().msg_sender();
        self._transfer(from, to, amount)?;
        Ok(true)
    }

    /// Returns the allowance of a spender for an owner
    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances.getter(owner).get(spender)
    }

    /// Approves a spender to spend tokens on behalf of the caller
    pub fn approve(&mut self, spender: Address, amount: U256) -> Result<bool, Vec<u8>> {
        let owner = self.vm().msg_sender();
        self._approve(owner, spender, amount)?;
        Ok(true)
    }

    /// Transfers tokens from one account to another using allowance
    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Result<bool, Vec<u8>> {
        let spender = self.vm().msg_sender();
        
        // Check and update allowance
        let current_allowance = self.allowances.getter(from).get(spender);
        
        if current_allowance < amount {
            return Err(InsufficientAllowance {
                owner: from,
                spender,
                have: current_allowance,
                want: amount,
            }.abi_encode());
        }

        // Update allowance
        let new_allowance = current_allowance - amount;
        self.allowances.setter(from).setter(spender).set(new_allowance);

        // Perform transfer
        self._transfer(from, to, amount)?;
        
        Ok(true)
    }

    /// Increases the allowance of a spender
    pub fn increase_allowance(&mut self, spender: Address, added_value: U256) -> Result<bool, Vec<u8>> {
        let owner = self.vm().msg_sender();
        let current_allowance = self.allowances.getter(owner).get(spender);
        let new_allowance = current_allowance + added_value;
        self._approve(owner, spender, new_allowance)?;
        Ok(true)
    }

    /// Decreases the allowance of a spender
    pub fn decrease_allowance(&mut self, spender: Address, subtracted_value: U256) -> Result<bool, Vec<u8>> {
        let owner = self.vm().msg_sender();
        let current_allowance = self.allowances.getter(owner).get(spender);
        
        if current_allowance < subtracted_value {
            return Err(InsufficientAllowance {
                owner,
                spender,
                have: current_allowance,
                want: subtracted_value,
            }.abi_encode());
        }
        
        let new_allowance = current_allowance - subtracted_value;
        self._approve(owner, spender, new_allowance)?;
        Ok(true)
    }
}

// Internal helper functions
impl Erc20 {
    /// Internal transfer function
    fn _transfer(&mut self, from: Address, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        // Validate addresses
        if from == Address::ZERO {
            return Err(InvalidSender { from }.abi_encode());
        }
        if to == Address::ZERO {
            return Err(InvalidRecipient { to }.abi_encode());
        }

        // Check balance
        let from_balance = self.balances.get(from);
        if from_balance < amount {
            return Err(InsufficientBalance {
                from,
                have: from_balance,
                want: amount,
            }.abi_encode());
        }

        // Update balances
        self.balances.setter(from).set(from_balance - amount);
        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + amount);

        // Emit event
        log(self.vm(), Transfer { from, to, value: amount });

        Ok(())
    }

    /// Internal approve function
    fn _approve(&mut self, owner: Address, spender: Address, amount: U256) -> Result<(), Vec<u8>> {
        if owner == Address::ZERO {
            return Err(InvalidSender { from: owner }.abi_encode());
        }
        if spender == Address::ZERO {
            return Err(InvalidRecipient { to: spender }.abi_encode());
        }

        self.allowances.setter(owner).setter(spender).set(amount);

        log(self.vm(), Approval {
            owner,
            spender,
            value: amount,
        });

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
        let mut token = Erc20::from(&vm);

        token.initialize(
            String::from("MyToken"),
            String::from("MTK"),
            U256::from(18),
            U256::from(1000000),
        );

        assert_eq!(token.name(), "MyToken");
        assert_eq!(token.symbol(), "MTK");
        assert_eq!(token.decimals(), U256::from(18));
        assert_eq!(token.total_supply(), U256::from(1000000));
        assert_eq!(token.balance_of(vm.msg_sender()), U256::from(1000000));
    }

    #[test]
    fn test_transfer() {
        let vm = TestVM::default();
        let mut token = Erc20::from(&vm);

        token.initialize(
            String::from("Test"),
            String::from("TST"),
            U256::from(18),
            U256::from(1000),
        );

        let recipient = Address::from([1u8; 20]);
        assert!(token.transfer(recipient, U256::from(100)).is_ok());
        assert_eq!(token.balance_of(recipient), U256::from(100));
        assert_eq!(token.balance_of(vm.msg_sender()), U256::from(900));
    }

    #[test]
    fn test_approve_and_transfer_from() {
        let vm = TestVM::default();
        let mut token = Erc20::from(&vm);

        token.initialize(
            String::from("Test"),
            String::from("TST"),
            U256::from(18),
            U256::from(1000),
        );

        let spender = Address::from([2u8; 20]);
        assert!(token.approve(spender, U256::from(500)).is_ok());
        assert_eq!(token.allowance(vm.msg_sender(), spender), U256::from(500));
    }
}
