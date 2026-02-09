# ERC721 NFT Deployment Guide

This guide will help you deploy your own ERC721 NFT collection using the Stylus ERC721 contract.

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

## Step 3: Initialize Your NFT Collection

After deployment, you need to call the `initialize` function with your NFT collection details:

**Parameters**:
- `name`: Collection name (e.g., "My Awesome NFTs")
- `symbol`: Collection symbol (e.g., "MAN")
- `base_uri`: Base URI for metadata (e.g., "https://api.example.com/metadata/")

### Using cast (from Foundry):

```bash
# Install Foundry if you haven't
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Initialize your NFT collection
cast send <CONTRACT_ADDRESS> \
  "initialize(string,string,string)" \
  "My Awesome NFTs" \
  "MAN" \
  "https://api.example.com/metadata/" \
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
  "function initialize(string name, string symbol, string baseUri)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function mint(address to) returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenUri(uint256 tokenId) view returns (string)",
  "function transferFrom(address from, address to, uint256 tokenId) returns (bool)"
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function deployNFT() {
  // Initialize the collection
  const tx = await contract.initialize(
    "My Awesome NFTs",
    "MAN",
    "https://api.example.com/metadata/"
  );
  
  await tx.wait();
  console.log("NFT collection initialized!");
  
  const name = await contract.name();
  const symbol = await contract.symbol();
  console.log(`Collection: ${name} (${symbol})`);
}

deployNFT();
```

## Step 4: Mint NFTs

### Using cast:

```bash
# Mint an NFT to yourself
cast send <CONTRACT_ADDRESS> \
  "mint(address)" \
  <YOUR_ADDRESS> \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Check who owns token ID 1
cast call <CONTRACT_ADDRESS> \
  "ownerOf(uint256)" \
  1 \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Get token URI for token ID 1
cast call <CONTRACT_ADDRESS> \
  "tokenUri(uint256)" \
  1 \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Using ethers.js:

```javascript
async function mintNFT() {
  const tx = await contract.mint(wallet.address);
  const receipt = await tx.wait();
  
  // Get token ID from Transfer event
  const transferEvent = receipt.logs.find(log => 
    log.topics[0] === ethers.id("Transfer(address,address,uint256)")
  );
  
  const tokenId = ethers.toBigInt(transferEvent.topics[3]);
  console.log(`Minted NFT with token ID: ${tokenId}`);
  
  // Get token URI
  const tokenUri = await contract.tokenUri(tokenId);
  console.log(`Token URI: ${tokenUri}`);
  
  // Check balance
  const balance = await contract.balanceOf(wallet.address);
  console.log(`Your NFT balance: ${balance}`);
}

mintNFT();
```

## Step 5: Interact with Your NFTs

### Transfer an NFT:

```bash
cast send <CONTRACT_ADDRESS> \
  "transferFrom(address,address,uint256)" \
  <FROM_ADDRESS> \
  <TO_ADDRESS> \
  <TOKEN_ID> \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Approve someone to transfer your NFT:

```bash
cast send <CONTRACT_ADDRESS> \
  "approve(address,uint256)" \
  <APPROVED_ADDRESS> \
  <TOKEN_ID> \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Set approval for all NFTs:

```bash
cast send <CONTRACT_ADDRESS> \
  "setApprovalForAll(address,bool)" \
  <OPERATOR_ADDRESS> \
  true \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Burn an NFT:

```bash
cast send <CONTRACT_ADDRESS> \
  "burn(uint256)" \
  <TOKEN_ID> \
  --private-key <YOUR_PRIVATE_KEY> \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

## Using the Deployment Script

For convenience, you can use the provided deployment script:

```bash
# Make it executable
chmod +x deploy.sh

# Run the script
./deploy.sh
```

The script will:
1. Build your contract
2. Check it's valid
3. Deploy to Arbitrum Sepolia
4. Show you the next steps with pre-filled commands

## Metadata Setup

For your NFTs to display properly on marketplaces like OpenSea, you need to host metadata JSON files. Each token's metadata should be at: `{base_uri}{token_id}`

Example metadata format (ERC721 standard):

```json
{
  "name": "My NFT #1",
  "description": "This is my first NFT",
  "image": "ipfs://QmXxxx...",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ]
}
```

## Production Deployment

To deploy to Arbitrum mainnet:

1. Update `.env` with mainnet RPC:
```
RPC_URL=https://arb1.arbitrum.io/rpc
NETWORK=mainnet
```

2. Ensure you have real ETH for gas

3. Deploy:
```bash
cargo stylus deploy --private-key=$PRIVATE_KEY --endpoint=https://arb1.arbitrum.io/rpc
```

## Troubleshooting

### Build Errors

If you get build errors, make sure:
- Rust is up to date: `rustup update`
- WASM target is installed: `rustup target add wasm32-unknown-unknown`
- Dependencies are current: `cargo update`

### Deployment Errors

- **Insufficient funds**: Make sure you have enough ETH for gas
- **RPC issues**: Try a different RPC endpoint
- **Contract size too large**: Optimize with `opt-level = 3` in Cargo.toml

### Initialization Errors

- **Already initialized**: The contract can only be initialized once
- **Invalid parameters**: Check that all strings are valid UTF-8

## Example: Complete TypeScript Deployment

```typescript
import { ethers } from 'ethers';

async function deployAndSetupNFT() {
  // Setup
  const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const contractAddress = '0x...'; // Your deployed contract
  
  const abi = [
    "function initialize(string,string,string)",
    "function mint(address) returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function ownerOf(uint256) view returns (address)",
    "function tokenUri(uint256) view returns (string)",
    "function transferFrom(address,address,uint256) returns (bool)",
    "function approve(address,uint256) returns (bool)",
    "function setApprovalForAll(address,bool) returns (bool)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  
  // Initialize
  console.log('Initializing NFT collection...');
  let tx = await contract.initialize(
    "Awesome NFT Collection",
    "ANFT",
    "https://my-api.com/metadata/"
  );
  await tx.wait();
  console.log('✅ Initialized!');
  
  // Mint 5 NFTs
  console.log('Minting NFTs...');
  for (let i = 0; i < 5; i++) {
    tx = await contract.mint(wallet.address);
    await tx.wait();
    console.log(`✅ Minted NFT #${i + 1}`);
  }
  
  // Check balance
  const balance = await contract.balanceOf(wallet.address);
  console.log(`\nYour NFT balance: ${balance}`);
  
  // Check first token
  const owner = await contract.ownerOf(1);
  const uri = await contract.tokenUri(1);
  console.log(`Token #1 owner: ${owner}`);
  console.log(`Token #1 URI: ${uri}`);
}

deployAndSetupNFT().catch(console.error);
```

## Support

For issues or questions:
- Check the [Arbitrum Stylus Documentation](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- Visit the [Arbitrum Discord](https://discord.gg/arbitrum)
- Review the contract code in `src/lib.rs`
