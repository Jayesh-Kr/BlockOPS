# Contract Explorer - Smart Contract Interaction Agent

## Overview

The Contract Explorer is a powerful agent that allows users to interact with deployed smart contracts directly from the BlockOps platform. Similar to block explorers like Etherscan or BlockScout, users can:

1. Enter a contract address
2. View all available contract functions (read and write)
3. Test functions by providing parameters
4. Execute write functions using their connected Web3 wallet

## Features

### 1. **Contract Loading**
- Enter any deployed contract address
- Automatically fetches the contract ABI from the block explorer API
- Validates the contract exists on the blockchain
- Displays contract information and available functions

### 2. **Function Discovery**
- Automatically parses and categorizes contract functions
- Separates **Read Functions** (view/pure) and **Write Functions** (state-changing)
- Shows function signatures with input and output parameters
- Displays parameter types and names

### 3. **Read Functions (Query)**
- Execute view/pure functions without gas costs
- No wallet connection required
- Instant results displayed
- View return values in human-readable format

### 4. **Write Functions (Transactions)**
- Requires connected wallet (agent wallet)
- Executes state-changing transactions
- Shows transaction confirmation
- Provides transaction hash and explorer link
- Real-time transaction status updates

### 5. **Wallet Integration**
- Uses the agent wallet system
- Automatic transaction signing
- Gas estimation and handling
- Transaction history tracking

## Usage Guide

### Step 1: Access Contract Explorer
1. Navigate to "My Agents" page
2. Click on the **"Contract Explorer"** button in the header
3. Or access directly at `/contract-explorer`

### Step 2: Connect Your Wallet (Optional for Read Functions)
1. Click the **"Wallet"** button in the header
2. Create a new wallet or import an existing one
3. Ensure your wallet has sufficient balance for write transactions

### Step 3: Load a Contract
1. Enter the contract address in the input field (e.g., `0x1234...abcd`)
2. Click **"Load Contract"** button
3. Wait for the ABI to be fetched from the explorer
4. Contract functions will be displayed in tabs

### Step 4: Execute Read Functions
1. Navigate to the **"Read Functions"** tab
2. Select the function you want to call
3. Fill in any required input parameters
4. Click **"Execute [function_name]"**
5. View the result in the output section

### Step 5: Execute Write Functions
1. Navigate to the **"Write Functions"** tab
2. Ensure your wallet is connected and has sufficient balance
3. Select the function you want to call
4. Fill in any required input parameters
5. Click **"Execute [function_name]"**
6. Wait for transaction confirmation
7. View transaction hash and click to see on block explorer

## Technical Implementation

### Components

#### 1. `ContractInteraction` Component
Location: `/frontend/components/contract-interaction.tsx`

Main component that handles:
- Contract address input and validation
- ABI fetching from block explorer
- Function parsing and categorization
- Function execution (read/write)
- Result display and error handling

#### 2. `ContractExplorerPage` Component
Location: `/frontend/app/contract-explorer/page.tsx`

Page wrapper that provides:
- Navigation header
- Wallet integration
- User profile access
- Responsive layout

### Key Technologies

- **ethers.js v6**: Ethereum library for contract interaction
- **React**: UI framework
- **Next.js**: React framework with server-side rendering
- **Tailwind CSS**: Styling
- **Radix UI**: Component primitives

### Contract ABI Fetching

The system attempts to fetch the contract ABI from the block explorer API:

```typescript
const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_API || "https://explorer.blockops.network/api"
const response = await fetch(
  `${explorerUrl}?module=contract&action=getabi&address=${contractAddress}`
)
```

If the contract is verified on the explorer, the ABI will be loaded automatically. Otherwise, users will need to manually provide the ABI.

### Function Execution Flow

#### Read Functions (View/Pure)
```typescript
const provider = new ethers.JsonRpcProvider(RPC_URL)
const contract = new ethers.Contract(contractAddress, abi, provider)
const result = await contract[functionName](...params)
```

#### Write Functions (State-Changing)
```typescript
const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(privateKey, provider)
const contract = new ethers.Contract(contractAddress, abi, wallet)
const tx = await contract[functionName](...params)
const receipt = await tx.wait()
```

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Blockchain RPC URL
NEXT_PUBLIC_RPC_URL=https://rpc.blockops.network/

# Block Explorer URL
NEXT_PUBLIC_EXPLORER_URL=https://explorer.blockops.network

# Block Explorer API URL
NEXT_PUBLIC_EXPLORER_API=https://explorer.blockops.network/api
```

### Supported Networks

The Contract Explorer currently supports:
- BlockOps Testnet (default)
- Any EVM-compatible network (by changing RPC_URL)

## Security Considerations

### Private Key Management
- Private keys are stored securely in the database
- Never expose private keys in client-side code
- Transactions are signed locally before broadcasting

### Contract Validation
- Always verify the contract address before interacting
- Check contract verification status on block explorer
- Review function parameters carefully before execution

### Transaction Safety
- Read functions are safe and don't require gas
- Write functions require wallet balance and gas
- Always review transaction details before confirming
- Check transaction receipt for success/failure

## Example Use Cases

### 1. Token Contract Interaction
```
Contract: ERC20 Token
Address: 0x1234...abcd

Read Functions:
- balanceOf(address) → Check token balance
- totalSupply() → View total supply
- name() → Get token name

Write Functions:
- transfer(address, uint256) → Send tokens
- approve(address, uint256) → Approve spending
```

### 2. NFT Contract Interaction
```
Contract: ERC721 NFT
Address: 0x5678...efgh

Read Functions:
- ownerOf(tokenId) → Check NFT owner
- tokenURI(tokenId) → Get metadata URI
- balanceOf(address) → Count NFTs owned

Write Functions:
- mint(address, tokenId) → Create NFT
- transferFrom(from, to, tokenId) → Transfer NFT
- approve(address, tokenId) → Approve transfer
```

### 3. Custom Contract Interaction
```
Contract: Custom DApp Contract
Address: 0x9abc...ijkl

Read Functions:
- getUserData(address) → Fetch user info
- getStatus() → Check contract status

Write Functions:
- updateProfile(string) → Update user data
- executeAction() → Trigger contract action
```

## Troubleshooting

### Contract Not Found
- **Issue**: "No contract found at this address"
- **Solution**: Verify the address is correct and the contract is deployed on the network

### ABI Not Verified
- **Issue**: "Contract exists but ABI is not verified"
- **Solution**: Verify the contract on the block explorer or provide the ABI manually

### Transaction Failed
- **Issue**: Transaction reverts or fails
- **Solution**: 
  - Check wallet balance (insufficient gas)
  - Verify function parameters are correct
  - Review contract requirements (e.g., approval needed)

### Wallet Not Connected
- **Issue**: "Please connect your wallet to execute write functions"
- **Solution**: Click "Wallet" button and create/import a wallet

## Future Enhancements

### Planned Features
- [ ] Manual ABI input for unverified contracts
- [ ] Transaction history and tracking
- [ ] Gas estimation before transaction
- [ ] Multi-network support (network switcher)
- [ ] Contract event monitoring
- [ ] Batch transaction execution
- [ ] Contract source code viewer
- [ ] Advanced parameter input (structs, arrays)
- [ ] Transaction simulation before execution
- [ ] Save favorite contracts

## API Reference

### ContractInteraction Props

```typescript
interface ContractInteractionProps {
  onInteraction?: (
    address: string, 
    functionName: string, 
    params: any[]
  ) => void
}
```

### ContractFunction Interface

```typescript
interface ContractFunction {
  name: string
  type: string
  stateMutability: string
  inputs: Array<{
    name: string
    type: string
    internalType?: string
  }>
  outputs: Array<{
    name: string
    type: string
    internalType?: string
  }>
}
```

## Contributing

To contribute to the Contract Explorer:

1. Follow the existing code structure
2. Add proper TypeScript types
3. Include error handling
4. Test with various contract types
5. Update documentation

## Support

For issues or questions:
- Check the troubleshooting section
- Review the example use cases
- Contact the development team
