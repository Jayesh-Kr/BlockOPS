#!/bin/bash

# ERC20 Token Deployment Script
# This script helps deploy and initialize an ERC20 token on Arbitrum

set -e

echo "╔═══════════════════════════════════════════════╗"
echo "║   ERC20 Token Factory - Deployment Script    ║"
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
    echo "❌ Failed to extract contract address from deployment output"
    exit 1
fi

echo ""
echo "✅ Contract deployed successfully!"
echo "📍 Contract Address: $CONTRACT_ADDRESS"
echo ""

# Save contract address to file
echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env
echo "💾 Contract address saved to .env file"
echo ""

# Step 4: Prompt for token details
read -p "Enter token name (e.g., 'My Awesome Token'): " TOKEN_NAME
read -p "Enter token symbol (e.g., 'MAT'): " TOKEN_SYMBOL
read -p "Enter decimals (default 18): " TOKEN_DECIMALS
TOKEN_DECIMALS=${TOKEN_DECIMALS:-18}
read -p "Enter initial supply (e.g., 1000000 for 1M tokens): " INITIAL_SUPPLY

# Calculate supply with decimals
SUPPLY_WITH_DECIMALS="${INITIAL_SUPPLY}$(printf '0%.0s' $(seq 1 $TOKEN_DECIMALS))"

echo ""
echo "📋 Token Details:"
echo "   Name: $TOKEN_NAME"
echo "   Symbol: $TOKEN_SYMBOL"
echo "   Decimals: $TOKEN_DECIMALS"
echo "   Initial Supply: $INITIAL_SUPPLY (raw: $SUPPLY_WITH_DECIMALS)"
echo ""

# Check if cast is installed
if ! command -v cast &> /dev/null; then
    echo "⚠️  Warning: 'cast' command not found. Please install Foundry:"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    echo ""
    echo "To initialize your token manually, run:"
    echo "cast send $CONTRACT_ADDRESS \\"
    echo "  'initialize(string,string,uint8,uint256)' \\"
    echo "  '$TOKEN_NAME' \\"
    echo "  '$TOKEN_SYMBOL' \\"
    echo "  $TOKEN_DECIMALS \\"
    echo "  $SUPPLY_WITH_DECIMALS \\"
    echo "  --private-key \$PRIVATE_KEY \\"
    echo "  --rpc-url $RPC_URL"
    exit 0
fi

# Step 5: Initialize the token
echo "🔧 Initializing token..."
cast send $CONTRACT_ADDRESS \
  "initialize(string,string,uint8,uint256)" \
  "$TOKEN_NAME" \
  "$TOKEN_SYMBOL" \
  $TOKEN_DECIMALS \
  $SUPPLY_WITH_DECIMALS \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║         🎉 Token Deployed Successfully!       ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "📍 Contract Address: $CONTRACT_ADDRESS"
echo "🏷️  Token Name: $TOKEN_NAME"
echo "🔤 Token Symbol: $TOKEN_SYMBOL"
echo "📊 Total Supply: $INITIAL_SUPPLY $TOKEN_SYMBOL"
echo ""
echo "🔍 View on Explorer:"
if [ "$NETWORK" = "sepolia" ]; then
    echo "   https://sepolia.arbiscan.io/address/$CONTRACT_ADDRESS"
else
    echo "   https://arbiscan.io/address/$CONTRACT_ADDRESS"
fi
echo ""
echo "📝 Next steps:"
echo "   1. Verify your token balance"
echo "   2. Transfer tokens to users"
echo "   3. List on DEX (if mainnet)"
echo ""
