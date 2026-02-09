# Complete ERC721 NFT Factory Deployment Guide

## Overview

This NFT Factory allows **ANY user** to deploy their own independent ERC721 NFT collections using the **EIP-1167 Minimal Proxy Pattern**. Each collection is a real, separate contract with its own storage and minting capabilities.

## How It Works

### Architecture

```
┌─────────────────────┐
│  NFT Factory        │ ← Users interact here
└──────────┬──────────┘
           │
           │ CREATE2 (deploys clones)
           ▼
     ┌──────────┬──────────┬──────────┐
     │ Apes NFT │ Punks NFT│ Cats NFT │  ← Each is a real contract
     └──────────┴──────────┴──────────┘
           │          │          │
           │          │          │
           ▼          ▼          ▼
     ┌─────────────────────────────────┐
     │  ERC721 Implementation          │ ← Shared logic (template)
     └─────────────────────────────────┘
```

### Key Components

1. **ERC721 Implementation Contract**: The template contract with all NFT logic
2. **NFT Factory Contract**: Creates minimal proxies (clones) of the implementation
3. **Cloned NFT Collections**: Independent collections deployed for each user via CREATE2

## Deployment Steps

### Step 1: Deploy the ERC721 Implementation (Template)

First, compile and deploy the `Erc721` contract as a standalone implementation:

```bash
cd contract/nft_factory

# Build the implementation contract
cargo stylus check

# Deploy the implementation
cargo stylus deploy \
  --private-key-path=./deployer-key.txt \
  --endpoint=https://your-arbitrum-endpoint.com
```

**Save the deployed address!** You'll need it for the factory.

Example: `0x9876543210987654321098765432109876543210`

### Step 2: Deploy the NFT Factory

Deploy the `NftFactory` contract:

```bash
# The factory deployment
cargo stylus deploy \
  --private-key-path=./deployer-key.txt \
  --endpoint=https://your-arbitrum-endpoint.com
```

**Save this address too!** This is what users will interact with.

Example: `0xFEDCBA0987654321FEDCBA0987654321FEDCBA09`

### Step 3: Initialize the Factory

Call the `initialize()` function on the factory with the implementation address:

```javascript
// Using ethers.js v6
const factory = await ethers.getContractAt(
  "NftFactory", 
  "0xFEDCBA0987654321FEDCBA0987654321FEDCBA09"
);

await factory.initialize("0x9876543210987654321098765432109876543210");
```

Or using cast:

```bash
cast send 0xFEDCBA0987654321FEDCBA0987654321FEDCBA09 \
  "initialize(address)" \
  0x9876543210987654321098765432109876543210 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

## User Interaction

### Creating an NFT Collection

Any user can now create their own NFT collection:

```javascript
// User A creates their NFT collection
const tx = await factory.create_collection(
  "Awesome Apes",                    // name
  "APES",                            // symbol
  "ipfs://QmYourIPFSHash/"           // base URI for metadata
);

const receipt = await tx.wait();

// Get the new collection address from event
const event = receipt.logs.find(log => log.eventName === "CollectionCreated");
const collectionAddress = event.args.collection_address;

console.log(`NFT Collection deployed at: ${collectionAddress}`);
```

### Minting NFTs

Once created, users can mint and manage NFTs in their collection:

```javascript
const nftCollection = await ethers.getContractAt("Erc721", collectionAddress);

// Mint an NFT to an address
const mintTx = await nftCollection.mint(recipientAddress);
const mintReceipt = await mintTx.wait();

// Get the token ID from the Transfer event
const transferEvent = mintReceipt.logs.find(log => 
  log.topics[0] === ethers.id("Transfer(address,address,uint256)")
);
const tokenId = ethers.toBigInt(transferEvent.topics[3]);

console.log(`Minted NFT #${tokenId}`);

// Get token URI (metadata link)
const tokenURI = await nftCollection.token_uri(tokenId);
console.log(`Metadata: ${tokenURI}`); // e.g., ipfs://QmYourIPFSHash/1
```

### Managing NFTs

Standard ERC721 functionality is available:

```javascript
// Check owner of a token
const owner = await nftCollection.owner_of(tokenId);

// Check balance (number of NFTs owned)
const balance = await nftCollection.balance_of(ownerAddress);

// Transfer NFT
await nftCollection.transfer_from(fromAddress, toAddress, tokenId);

// Approve transfer
await nftCollection.approve(approvedAddress, tokenId);

// Set approval for all
await nftCollection.set_approval_for_all(operatorAddress, true);

// Burn (destroy) an NFT
await nftCollection.burn(tokenId);
```

## Verification

### Verify Each Component

1. **Verify Implementation Contract** deployment
2. **Verify Factory Contract** is initialized with correct implementation
3. **Verify Collection Creation** by calling `create_collection()` and checking the event

### Test Script

```javascript
// test-nft-factory.js
import { ethers } from "ethers";

async function testNftFactory() {
  const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
  const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
  
  const factory = await ethers.getContractAt(
    "NftFactory",
    "FACTORY_ADDRESS",
    wallet
  );
  
  // Check implementation
  const impl = await factory.get_implementation();
  console.log("Implementation:", impl);
  
  // Create a collection
  console.log("Creating NFT collection...");
  const tx = await factory.create_collection(
    "Test NFT Collection",
    "TNFT",
    "ipfs://QmTestHash/"
  );
  
  const receipt = await tx.wait();
  console.log("Collection created! Transaction:", receipt.hash);
  
  // Get collection count
  const count = await factory.get_collection_count();
  console.log("Total collections created:", count.toString());
  
  // Get the collection address
  const collectionAddr = await factory.get_collection_by_id(count - 1n);
  console.log("New collection address:", collectionAddr);
  
  // Interact with the collection
  const collection = await ethers.getContractAt("Erc721", collectionAddr, wallet);
  const name = await collection.name();
  const symbol = await collection.symbol();
  const baseUri = await collection.base_uri();
  
  console.log(`Collection Name: ${name}`);
  console.log(`Collection Symbol: ${symbol}`);
  console.log(`Base URI: ${baseUri}`);
  
  // Mint an NFT
  console.log("Minting NFT #1...");
  const mintTx = await collection.mint(wallet.address);
  await mintTx.wait();
  
  const balance = await collection.balance_of(wallet.address);
  console.log(`Your NFT Balance: ${balance.toString()}`);
  
  const tokenUri = await collection.token_uri(1);
  console.log(`Token #1 URI: ${tokenUri}`);
}

testNftFactory().catch(console.error);
```

## Real-World Example

### Scenario: Three Artists Creating NFT Collections

```javascript
// Artist Alice creates Awesome Apes
const alice = new ethers.Wallet(ALICE_KEY, provider);
const factoryAlice = factory.connect(alice);
const txAlice = await factoryAlice.create_collection(
  "Awesome Apes", 
  "APES", 
  "ipfs://QmApes/"
);
// Apes Collection deployed at: 0xAAA...

// Artist Bob creates Beautiful Butterflies
const bob = new ethers.Wallet(BOB_KEY, provider);
const factoryBob = factory.connect(bob);
const txBob = await factoryBob.create_collection(
  "Beautiful Butterflies", 
  "BTFL", 
  "ipfs://QmButterflies/"
);
// Butterflies Collection deployed at: 0xBBB...

// Artist Carol creates Cool Cats
const carol = new ethers.Wallet(CAROL_KEY, provider);
const factoryCarol = factory.connect(carol);
const txCarol = await factoryCarol.create_collection(
  "Cool Cats", 
  "CATS", 
  "ipfs://QmCats/"
);
// Cats Collection deployed at: 0xCCC...
```

Each collection is **completely independent** with:
- ✅ Unique contract address
- ✅ Separate storage for NFTs
- ✅ Independent token IDs
- ✅ Full ERC721 functionality
- ✅ Custom metadata URIs

## Metadata Best Practices

### IPFS Setup

1. **Upload Images to IPFS**
   ```bash
   # Upload your NFT images
   ipfs add -r ./nft-images/
   # Returns: QmYourIPFSHash
   ```

2. **Create Metadata JSON Files**
   ```json
   // 1.json
   {
     "name": "Awesome Ape #1",
     "description": "The first ape in the collection",
     "image": "ipfs://QmYourImageHash/1.png",
     "attributes": [
       {"trait_type": "Background", "value": "Blue"},
       {"trait_type": "Eyes", "value": "Laser"}
     ]
   }
   ```

3. **Upload Metadata to IPFS**
   ```bash
   ipfs add -r ./metadata/
   # Returns: QmYourMetadataHash
   ```

4. **Use Base URI in Collection**
   ```javascript
   await factory.create_collection(
     "Awesome Apes",
     "APES",
     "ipfs://QmYourMetadataHash/"  // Note the trailing slash!
   );
   // Token #1 will have URI: ipfs://QmYourMetadataHash/1
   // Token #2 will have URI: ipfs://QmYourMetadataHash/2
   ```

## Technical Details

### EIP-1167 Minimal Proxy

The factory uses **EIP-1167** to deploy extremely gas-efficient clones:

```
Bytecode: 0x363d3d373d3d3d363d73[implementation]5af43d82803e903d91602b57fd5bf3
```

This creates a proxy that:
1. Delegates all calls to the implementation
2. Uses only ~45 bytes of bytecode
3. Costs ~10x less gas than deploying full contracts

### Storage Separation

Each cloned NFT collection has its own storage space:
- Collection A's NFTs ≠ Collection B's NFTs
- Collection A's token IDs ≠ Collection B's token IDs
- Completely isolated ownership records

### Gas Costs

- **Implementation Deploy**: ~600K gas (one-time)
- **Factory Deploy**: ~900K gas (one-time)
- **Create Collection**: ~250K gas per collection 🎉
- **Mint NFT**: ~80K gas per NFT
- **Compare to full deploy**: ~2.5M gas per collection ❌

## Advanced Features

### Querying Collections

```javascript
// Get all collections (paginated)
const collections = await factory.get_collections(0, 10); // First 10 collections

// Get collection by ID
const collection = await factory.get_collection_by_id(5);

// Get collection ID by address
const collectionId = await factory.get_collection_id(collectionAddress);
```

### Collection Management

```javascript
const collection = await ethers.getContractAt("Erc721", collectionAddress);

// Get collection info
const creator = await collection.creator();
const name = await collection.name();
const symbol = await collection.symbol();
const totalSupply = await collection.total_supply();

// Check if specific address owns NFTs
const balance = await collection.balance_of(userAddress);

// Get owner of specific token
const owner = await collection.owner_of(tokenId);
```

### Batch Operations

```javascript
// Mint multiple NFTs
const recipients = [addr1, addr2, addr3, addr4, addr5];

for (const recipient of recipients) {
  await collection.mint(recipient);
}

// Query multiple collections
const collectionCount = await factory.get_collection_count();
const batchSize = 10;

for (let i = 0; i < collectionCount; i += batchSize) {
  const batch = await factory.get_collections(i, batchSize);
  console.log(`Collections ${i} to ${i + batchSize}:`, batch);
}
```

## Security Considerations

⚠️ **Important Notes:**

1. **Auditing**: This is a template. Audit before mainnet use.
2. **Implementation Immutability**: The implementation cannot be changed once set
3. **Access Control**: Anyone can create collections (by design)
4. **Initialization**: Each collection can only be initialized once
5. **Minting Permissions**: Consider adding access control to `mint()` in production

## Marketplace Integration

### OpenSea Compatibility

Your NFTs will automatically work with OpenSea if:
1. ✅ Contract implements ERC721 standard
2. ✅ `tokenURI()` returns proper IPFS/HTTP URLs
3. ✅ Metadata follows OpenSea metadata standards

### Example Integration

```javascript
// After creating collection and minting
const collectionAddress = "0xYourCollectionAddress";
const tokenId = 1;

// OpenSea will automatically fetch metadata from:
// https://opensea.io/assets/arbitrum/${collectionAddress}/${tokenId}

// Make sure your metadata includes:
// - name
// - description
// - image (IPFS or HTTPS URL)
// - attributes (optional traits)
```

## Troubleshooting

### Common Issues

**Issue**: "InvalidImplementation" error
- **Fix**: Make sure you initialized the factory with the correct implementation address

**Issue**: "DeploymentFailed" error
- **Fix**: Check gas limits and ensure CREATE2 opcode is supported

**Issue**: Can't mint NFTs
- **Fix**: Verify you're calling the correct collection address, not the factory

**Issue**: Token URI not showing
- **Fix**: Ensure base URI ends with "/" and metadata files are named with token IDs (1, 2, 3, etc.)

**Issue**: "InvalidTokenId" error
- **Fix**: Token doesn't exist yet, mint it first

## Support

For questions or issues:
1. Check the contract comments in `lib.rs`
2. Review test cases in the `tests` module
3. Ensure Stylus SDK version compatibility
4. Verify IPFS gateway accessibility

## License

MIT License - Use at your own risk
