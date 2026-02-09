#!/bin/bash

# ERC721 NFT Deployment Script
# This script helps deploy and initialize an ERC721 NFT collection on Arbitrum

set -e

echo "╔═══════════════════════════════════════════════╗"
echo "║   ERC721 NFT Factory - Deployment Script     ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set"
    echo "Please set your private key in .env file or export PRIVATE_KEY=<your_key>"
    exit 1
fi

# Default to Arbitrum Sepolia testnet
RPC_URL="${RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc}"
NETWORK="${NETWORK:-sepolia}"

echo "📡 Network: $NETWORK"
echo "🔗 RPC URL: $RPC_URL"
echo ""

# Step 1: Build the contract
echo "📦 Building contract..."
cargo build --release --target wasm32-unknown-unknown

# Step 2: Check the contract
echo "✅ Checking contract..."
cargo stylus check --endpoint=$RPC_URL

# Step 3: Deploy the contract
echo "🚀 Deploying contract..."
DEPLOY_OUTPUT=$(cargo stylus deploy --private-key=$PRIVATE_KEY --endpoint=$RPC_URL 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'deployed code at address \K0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
fi

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Could not extract contract address from deployment output"
    exit 1
fi

echo ""
echo "✅ Contract deployed successfully!"
echo "📝 Contract Address: $CONTRACT_ADDRESS"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Initialize your NFT collection:"
echo ""
echo "   cast send $CONTRACT_ADDRESS \\"
echo "     \"initialize(string,string,string)\" \\"
echo "     \"My NFT Collection\" \\"
echo "     \"MNFT\" \\"
echo "     \"https://your-metadata-api.com/\" \\"
echo "     --private-key \$PRIVATE_KEY \\"
echo "     --rpc-url $RPC_URL"
echo ""
echo "2. Mint your first NFT:"
echo ""
echo "   cast send $CONTRACT_ADDRESS \\"
echo "     \"mint(address)\" \\"
echo "     <RECIPIENT_ADDRESS> \\"
echo "     --private-key \$PRIVATE_KEY \\"
echo "     --rpc-url $RPC_URL"
echo ""
echo "3. Check NFT ownership:"
echo ""
echo "   cast call $CONTRACT_ADDRESS \\"
echo "     \"ownerOf(uint256)\" \\"
echo "     1 \\"
echo "     --rpc-url $RPC_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Save this contract address for future use!"
echo ""

# Optionally save to a file
echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > .deployed
echo "NETWORK=$NETWORK" >> .deployed
echo "RPC_URL=$RPC_URL" >> .deployed

echo "💾 Contract address saved to .deployed file"
echo ""
