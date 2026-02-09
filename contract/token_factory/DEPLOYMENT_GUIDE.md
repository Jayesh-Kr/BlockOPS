# ERC20 Token Deployment Guide

This guide will help you deploy your own ERC20 token using the Stylus ERC20 contract.

## Prerequisites

1. **Install Rust and Cargo Stylus**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --force cargo-stylus cargo-stylus-check
rustup target add wasm32-unknown-unknown
```

2. **Set up your environment**:
   - Get some testnet ETH on Arbitrum Sepolia
   - Set your private key in `.env` file

## Step 1: Build the Contract

```bash
cargo stylus check
cargo build --release --target wasm32-unknown-unknown
```

## Step 2: Deploy to Arbitrum Sepolia

```bash
cargo stylus deploy --private-key=<YOUR_PRIVATE_KEY> --endpoint=https://sepolia-rollup.arbitrum.io/rpc
```

This will deploy the contract and return the contract address.

## Step 3: Initialize Your Token

After deployment, you need to call the `initialize` function with your token details:

**Parameters**:
- `name`: Token name (e.g., "My Awesome Token")
- `symbol`: Token symbol (e.g., "MAT")
- `decimals`: Number of decimals (typically 18)
- `initial_supply`: Total supply in base units (e.g., 1000000 * 10^18 for 1M tokens with 18 decimals)

### Using cast (from Foundry):

```bash
# Install Foundry if you haven't
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Initialize your token
cast send <CONTRACT_ADDRESS> \
  "initialize(string,string,uint8,uint256)" \
  "My Awesome Token" \
  "MAT" \
  18 \
  1000000000000000000000000 \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Using ethers.js:

```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

const contractAddress = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
const abi = [
  "function initialize(string name, string symbol, uint8 decimals, uint256 initialSupply)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function deployToken() {
  const tx = await contract.initialize(
    "My Awesome Token",
    "MAT",
    18,
    ethers.parseUnits("1000000", 18) // 1 million tokens
  );
  
  await tx.wait();
  console.log("Token initialized!");
  
  const name = await contract.name();
  const symbol = await contract.symbol();
  console.log(`Token: ${name} (${symbol})`);
}

deployToken();
```

## Step 4: Interact with Your Token

### Check balance:
```bash
cast call <CONTRACT_ADDRESS> "balanceOf(address)" <YOUR_ADDRESS> --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Transfer tokens:
```bash
cast send <CONTRACT_ADDRESS> \
  "transfer(address,uint256)" \
  <RECIPIENT_ADDRESS> \
  1000000000000000000 \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

## Export ABI

To get the contract ABI for use with frontends:

```bash
cargo stylus export-abi
```

## Mainnet Deployment

For mainnet deployment, simply change the RPC endpoint to:
```
https://arb1.arbitrum.io/rpc
```

**⚠️ Warning**: Ensure you have enough ETH for gas fees and thoroughly test on testnet first!

## Token Parameters Guide

### Name
- Full name of your token (e.g., "Ethereum", "USD Coin")
- Can contain spaces and special characters

### Symbol
- Short ticker (e.g., "ETH", "USDC")
- Usually 3-5 uppercase characters

### Decimals
- Standard is 18 (like ETH)
- Use 6 for stablecoins (like USDC)
- Determines the smallest unit of your token

### Initial Supply
- Total number of tokens to create
- Multiply by 10^decimals for the actual value
- Example: For 1M tokens with 18 decimals: 1000000 * 10^18

## Security Considerations

1. **Test thoroughly** on testnet before mainnet
2. **Verify initialization** - can only be called once
3. **Secure your private keys** - never commit them to git
4. **Audit your contract** if handling significant value
5. **Consider multi-sig** for token management

## AI Integration

This contract is designed to work with AI agents. An AI can help users deploy tokens by:

1. Asking for token details (name, symbol, supply)
2. Deploying the contract
3. Initializing with user-specified parameters
4. Providing the contract address and transaction details

The AI should guide users through parameter selection and explain the implications of their choices.
