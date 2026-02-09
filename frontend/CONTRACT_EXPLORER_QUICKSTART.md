# Contract Explorer - Quick Start Guide

## What is Contract Explorer?

Contract Explorer is a user-friendly tool that lets you interact with any deployed smart contract on the blockchain, just like you would on Etherscan or other block explorers. No coding required!

## How to Use

### 1️⃣ Access the Contract Explorer
- Go to your **"My Agents"** page
- Click the **"Contract Explorer"** button in the top right
- Or navigate directly to `/contract-explorer`

### 2️⃣ Set Up Your Wallet (Optional for Read Operations)
If you want to execute write functions (transactions), you need a wallet:
- Click the **"Wallet"** button in the header
- Choose to **Create New Wallet** or **Import Wallet**
- Save your private key securely!
- Your wallet will be funded automatically on testnet

### 3️⃣ Load a Contract
1. Paste a contract address in the input field
   - Example: `0x1234567890123456789012345678901234567890`
2. Click **"Load Contract"**
3. Wait for the system to fetch the contract's ABI
4. All functions will appear in two tabs: Read and Write

### 4️⃣ Execute Read Functions (View Data)
**No wallet needed!** Read functions are free.

1. Go to the **"Read Functions"** tab
2. Pick a function (e.g., `balanceOf`, `name`, `totalSupply`)
3. Fill in any required parameters
4. Click **"Execute [function name]"**
5. See the result immediately!

**Example: Check Token Balance**
```
Function: balanceOf
Input: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb (your address)
Output: 1000000000000000000 (means 1 token if 18 decimals)
```

### 5️⃣ Execute Write Functions (Send Transactions)
**Wallet required!** Write functions cost gas.

1. Make sure your wallet is connected and funded
2. Go to the **"Write Functions"** tab
3. Pick a function (e.g., `transfer`, `mint`, `approve`)
4. Fill in all required parameters carefully
5. Click **"Execute [function name]"**
6. Wait for transaction confirmation
7. Get your transaction hash and view it on the explorer!

**Example: Transfer Tokens**
```
Function: transfer
Inputs:
  - to: 0x5678... (recipient address)
  - amount: 1000000000000000000 (1 token with 18 decimals)
Click Execute → Transaction sent! → View on Explorer
```

## Common Contract Types

### ERC20 Token Contract
**Read Functions:**
- `name()` - Get token name
- `symbol()` - Get token symbol
- `decimals()` - Get decimal places
- `totalSupply()` - Get total supply
- `balanceOf(address)` - Check balance

**Write Functions:**
- `transfer(to, amount)` - Send tokens
- `approve(spender, amount)` - Approve spending

### ERC721 NFT Contract
**Read Functions:**
- `name()` - Get collection name
- `symbol()` - Get collection symbol
- `ownerOf(tokenId)` - Check NFT owner
- `balanceOf(address)` - Count NFTs owned
- `tokenURI(tokenId)` - Get metadata

**Write Functions:**
- `mint(to, tokenId)` - Create NFT
- `transferFrom(from, to, tokenId)` - Transfer NFT
- `approve(to, tokenId)` - Approve transfer

## Tips & Tricks

### ✅ Understanding Parameter Types
- `address` - Wallet address (0x...)
- `uint256` - Whole number (e.g., 1000)
- `string` - Text (e.g., "Hello")
- `bool` - True or false
- `bytes` - Hexadecimal data (0x...)

### ✅ Working with Decimals
Most tokens use 18 decimals:
- 1 token = 1000000000000000000 (1 with 18 zeros)
- 0.5 token = 500000000000000000
- Use online converters to help!

### ✅ Gas and Transactions
- Read functions = FREE (no gas)
- Write functions = Cost gas (need funded wallet)
- Always verify parameters before executing
- Save transaction hashes for reference

### ✅ Security
- ⚠️ Never share your private key
- ⚠️ Always verify contract addresses
- ⚠️ Double-check parameters before executing write functions
- ⚠️ Test with small amounts first

## Troubleshooting

### "Contract Not Found"
- Check if the address is correct
- Make sure the contract is deployed on the network
- Verify you're on the right blockchain

### "ABI Not Verified"
- The contract isn't verified on the block explorer
- You'll need to manually input the ABI
- Or ask the contract owner to verify it

### "Transaction Failed"
- Check wallet balance (need gas)
- Verify input parameters are correct
- Some functions have requirements (e.g., approvals)
- Check error message for details

### "Wallet Not Connected"
- Click the "Wallet" button
- Create or import a wallet
- Make sure it's funded with testnet tokens

## Example Workflow

**Testing a New Token Contract:**

1. Deploy your token contract (or get address)
2. Open Contract Explorer
3. Load the contract address
4. Check `name()`, `symbol()`, `decimals()` (read)
5. Check your `balanceOf(yourAddress)` (read)
6. Try `transfer()` to send tokens (write)
7. Verify the transfer by checking balances again

**Interacting with an NFT Contract:**

1. Load NFT contract address
2. Check `totalSupply()` to see how many exist
3. Use `ownerOf(tokenId)` to check ownership
4. View `tokenURI(tokenId)` to see metadata
5. If you own it, `transfer()` to another address
6. Confirm new ownership with `ownerOf()`

## Need Help?

- 📖 Read the [full documentation](./CONTRACT_EXPLORER.md)
- 🐛 Check the troubleshooting section
- 💬 Ask in the community chat
- 🔍 Search for your error message

## Next Steps

Now that you know how to use Contract Explorer:
- Try interacting with popular contracts
- Test your own deployed contracts
- Build workflows using the Agent Builder
- Explore more BlockOps features

Happy exploring! 🚀
