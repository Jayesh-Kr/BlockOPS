# Contract Explorer - Setup Guide

## Environment Configuration

To use the Contract Explorer, you need to configure the following environment variables in your `.env.local` file:

### Required Variables

```env
# Blockchain RPC URL - The endpoint to connect to the blockchain
NEXT_PUBLIC_RPC_URL=https://rpc.blockops.network/

# Block Explorer Base URL - Used for transaction links
NEXT_PUBLIC_EXPLORER_URL=https://explorer.blockops.network

# Block Explorer API URL - Used to fetch contract ABIs
NEXT_PUBLIC_EXPLORER_API=https://explorer.blockops.network/api
```

## Setup Steps

### 1. Create Environment File

Copy the example file:
```bash
cd frontend
cp .env.example .env.local
```

### 2. Configure Your Network

#### For BlockOps Testnet (Default)
```env
NEXT_PUBLIC_RPC_URL=https://rpc.blockops.network/
NEXT_PUBLIC_EXPLORER_URL=https://explorer.blockops.network
NEXT_PUBLIC_EXPLORER_API=https://explorer.blockops.network/api
```

#### For Other Networks

**Ethereum Mainnet:**
```env
NEXT_PUBLIC_RPC_URL=https://eth.llamarpc.com
NEXT_PUBLIC_EXPLORER_URL=https://etherscan.io
NEXT_PUBLIC_EXPLORER_API=https://api.etherscan.io/api
```

**Ethereum Sepolia Testnet:**
```env
NEXT_PUBLIC_RPC_URL=https://sepolia.drpc.org
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.etherscan.io
NEXT_PUBLIC_EXPLORER_API=https://api-sepolia.etherscan.io/api
```

**Polygon Mainnet:**
```env
NEXT_PUBLIC_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_EXPLORER_URL=https://polygonscan.com
NEXT_PUBLIC_EXPLORER_API=https://api.polygonscan.com/api
```

**Arbitrum One:**
```env
NEXT_PUBLIC_RPC_URL=https://arb1.arbitrum.io/rpc
NEXT_PUBLIC_EXPLORER_URL=https://arbiscan.io
NEXT_PUBLIC_EXPLORER_API=https://api.arbiscan.io/api
```

### 3. Restart Development Server

After updating `.env.local`, restart your development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## API Key Requirements

### Block Explorer APIs

Some block explorers require API keys for ABI fetching:

#### Etherscan (Ethereum, Sepolia)
1. Sign up at https://etherscan.io/register
2. Go to API-KEYs section
3. Create a new API key
4. Update your `.env.local`:
```env
NEXT_PUBLIC_EXPLORER_API=https://api.etherscan.io/api?apikey=YOUR_API_KEY
```

#### Polygonscan (Polygon)
1. Sign up at https://polygonscan.com/register
2. Go to API-KEYs section
3. Create a new API key
4. Update your `.env.local`:
```env
NEXT_PUBLIC_EXPLORER_API=https://api.polygonscan.com/api?apikey=YOUR_API_KEY
```

### RPC Provider APIs

For production use, consider using a dedicated RPC provider:

#### Alchemy
```env
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

#### Infura
```env
NEXT_PUBLIC_RPC_URL=https://mainnet.infura.io/v3/YOUR_API_KEY
```

#### QuickNode
```env
NEXT_PUBLIC_RPC_URL=https://YOUR_ENDPOINT.quiknode.pro/YOUR_TOKEN/
```

## Verification

### Test RPC Connection
```bash
curl $NEXT_PUBLIC_RPC_URL \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Test Explorer API
```bash
curl "$NEXT_PUBLIC_EXPLORER_API?module=contract&action=getabi&address=0x..."
```

## Troubleshooting

### RPC URL Issues
**Problem:** "Failed to connect to RPC"
**Solutions:**
- Verify URL is correct
- Check if RPC is online
- Try a different RPC provider
- Check for rate limiting

### Explorer API Issues
**Problem:** "Failed to fetch contract ABI"
**Solutions:**
- Verify explorer API URL
- Check if contract is verified
- Add API key if required
- Try different explorer

### Environment Variables Not Loading
**Problem:** "Cannot read environment variables"
**Solutions:**
- Ensure file is named `.env.local`
- Variables must start with `NEXT_PUBLIC_`
- Restart development server
- Clear Next.js cache: `rm -rf .next`

## Network-Specific Configuration

### BlockOps Testnet
```env
NEXT_PUBLIC_RPC_URL=https://rpc.blockops.network/
NEXT_PUBLIC_EXPLORER_URL=https://explorer.blockops.network
NEXT_PUBLIC_EXPLORER_API=https://explorer.blockops.network/api
NEXT_PUBLIC_CHAIN_ID=1234
```

### Custom Network
```env
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_EXPLORER_URL=http://localhost:4000
NEXT_PUBLIC_EXPLORER_API=http://localhost:4000/api
NEXT_PUBLIC_CHAIN_ID=31337
```

## Best Practices

### Security
- ❌ Never commit `.env.local` to git
- ✅ Use `.env.example` for templates
- ✅ Keep API keys secret
- ✅ Use environment-specific files

### Performance
- ✅ Use RPC providers with high uptime
- ✅ Consider rate limits
- ✅ Cache ABI data when possible
- ✅ Use WebSocket for real-time data

### Development vs Production
```env
# .env.local (development)
NEXT_PUBLIC_RPC_URL=https://testnet.rpc.example.com

# .env.production (production)
NEXT_PUBLIC_RPC_URL=https://mainnet.rpc.example.com
```

## Additional Configuration

### Optional Variables

```env
# Gas price multiplier for transactions
NEXT_PUBLIC_GAS_MULTIPLIER=1.2

# Default gas limit
NEXT_PUBLIC_DEFAULT_GAS_LIMIT=3000000

# Transaction confirmation blocks
NEXT_PUBLIC_CONFIRMATIONS=2

# Enable debug mode
NEXT_PUBLIC_DEBUG=false
```

## Support

For configuration help:
- Check the [main documentation](./CONTRACT_EXPLORER.md)
- Review [quick start guide](./CONTRACT_EXPLORER_QUICKSTART.md)
- Contact support team

## Next Steps

After setup:
1. ✅ Verify all environment variables are set
2. ✅ Test RPC connection
3. ✅ Test explorer API
4. ✅ Load a contract to verify everything works
5. ✅ Create/import a wallet for write functions

---

**Ready to explore contracts!** 🚀
