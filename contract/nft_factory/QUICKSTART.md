# NFT Factory Quick Start Guide

## ✅ Your NFT Factory is Ready!

The ERC721 NFT Factory contract has been successfully created and is ready to deploy on Arbitrum.

## 📁 What Was Created

### Core Files
- **`src/lib.rs`** - Complete ERC721 NFT implementation with:
  - ✅ Minting functionality
  - ✅ Transfer & approval system
  - ✅ Burning NFTs
  - ✅ Metadata URI support
  - ✅ Full test suite

- **`src/main.rs`** - Entry point for ABI export
- **`Cargo.toml`** - Dependencies configured
- **`deploy.sh`** - Automated deployment script
- **`DEPLOYMENT_GUIDE.md`** - Detailed deployment instructions
- **`README.md`** - Complete documentation
- **`.env.example`** - Environment template

## 🚀 Quick Deploy

1. **Setup environment:**
   ```bash
   cd contract/nft_factory
   cp .env.example .env
   # Edit .env and add your PRIVATE_KEY
   ```

2. **Build and deploy:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Initialize your collection:**
   ```bash
   cast send <CONTRACT_ADDRESS> \
     "initialize(string,string,string)" \
     "My NFT Collection" \
     "MNFT" \
     "https://api.example.com/metadata/" \
     --private-key $PRIVATE_KEY \
     --rpc-url https://sepolia-rollup.arbitrum.io/rpc
   ```

4. **Mint your first NFT:**
   ```bash
   cast send <CONTRACT_ADDRESS> \
     "mint(address)" \
     <YOUR_ADDRESS> \
     --private-key $PRIVATE_KEY \
     --rpc-url https://sepolia-rollup.arbitrum.io/rpc
   ```

## 🎯 Key Features

### Just Like Token Factory
- Anyone can deploy their own NFT collection
- Customizable name, symbol, and metadata URI
- Built with Rust for security and efficiency
- Optimized for low gas costs on Arbitrum

### ERC721 Functions Available
- `mint(address)` - Create new NFTs
- `burn(tokenId)` - Destroy NFTs
- `transferFrom(from, to, tokenId)` - Transfer ownership
- `approve(to, tokenId)` - Approve transfers
- `setApprovalForAll(operator, approved)` - Approve all tokens
- `balanceOf(owner)` - Check NFT count
- `ownerOf(tokenId)` - Check token owner
- `tokenUri(tokenId)` - Get metadata URL

## 📚 Documentation

- See `DEPLOYMENT_GUIDE.md` for detailed instructions
- See `README.md` for complete API documentation
- See `src/lib.rs` for implementation details

## 🧪 Testing

```bash
cargo test
```

All tests should pass, including:
- ✅ Initialization
- ✅ Minting
- ✅ Transfers
- ✅ Approvals
- ✅ Burning

## 🌐 Networks

- **Testnet**: Arbitrum Sepolia (`https://sepolia-rollup.arbitrum.io/rpc`)
- **Mainnet**: Arbitrum One (`https://arb1.arbitrum.io/rpc`)

Get testnet ETH: https://faucet.arbitrum.io/

## 💡 Next Steps

1. Deploy to testnet first
2. Test minting and transfers
3. Set up your metadata hosting (IPFS or API)
4. Deploy to mainnet when ready

---

**Built with Arbitrum Stylus - Same quality as your working token_factory!** 🎉
