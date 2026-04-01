# Flow Track Features in BlockOPs

## Overview

BlockOPs now supports Flow EVM Testnet as the default consumer DeFi demo chain.

The project is designed to show:

- Wallet-aware chat actions on Flow
- Human-language automation with recurring schedules
- Flow-first savings, payouts, payroll, and grant workflows
- Flow onboarding support with faucet, explorer, and wallet-readiness helpers
- Optional sponsored gas wiring for backend-controlled Flow execution

## Flow Execution Model

- Default demo chain: `flow-testnet`
- Chain ID: `545`
- RPC: `https://testnet.evm.nodes.onflow.org`
- Explorer: `https://evm-testnet.flowscan.io`
- Native token: `FLOW`
- Optional sponsored RPC env:
  - `FLOW_EVM_TESTNET_SPONSORED_RPC_URL`

The chat UI includes a persisted chain selector, and the backend treats the selected/requested chain as authoritative unless the user explicitly names another chain in the message.

## Flow Wallet + UX Support

- Flow EVM Testnet is the default chain in the frontend provider setup
- Privy wallet onboarding remains available for walletless-style UX
- Traditional private key flow is still supported
- Lit PKP signing flow remains available for delegated/invisible security
- Flow faucet and Flowscan links are surfaced in the app
- Wallet address + chain are now preserved correctly through chat execution

## Flow-Supported Blockchain Tools

These tools are supported on Flow EVM Testnet in the current build:

- `get_balance`
- `transfer`
- `batch_transfer`
- `lookup_transaction`
- `lookup_block`
- `fetch_events`
- `decode_revert`
- `estimate_gas`
- `simulate_gas`
- `schedule_transfer`
- `create_savings_plan`
- `schedule_payout`
- `create_payroll_plan`
- `create_grant_payout`
- `schedule_reminder`
- `list_reminders`
- `cancel_reminder`
- `list_schedules`
- `cancel_schedule`
- `get_flow_network_overview`
- `get_flow_wallet_readiness`

## New Flow-First Tools

### `get_flow_network_overview`

Purpose:

- Show the BlockOPs Flow setup in one tool call
- Return faucet, explorer, chain id, RPC, and sponsored gas status

Example prompts:

- `Show me the Flow setup`
- `How is Flow configured in this app?`
- `Do we have sponsored gas on Flow?`

### `get_flow_wallet_readiness`

Purpose:

- Check whether a wallet is funded and ready for Flow automation
- Return Flow balance, wallet explorer link, faucet URL, and next action

Example prompts:

- `Is my Flow wallet ready?`
- `Check whether my wallet is funded on Flow`
- `Do I need Flow faucet funds?`

### `create_payroll_plan`

Purpose:

- Create recurring salary or contributor payments on Flow
- Uses the same scheduling engine as transfer automation

Example prompts:

- `Create a biweekly payroll plan for 10 FLOW to 0x...`
- `Pay this contributor every month on Flow`

### `create_grant_payout`

Purpose:

- Create recurring grant or stipend disbursements on Flow
- Uses the same scheduling engine as transfer automation

Example prompts:

- `Create a monthly grant payout of 25 FLOW to 0x...`
- `Schedule a recurring stipend on Flow`

## Consumer DeFi Flows You Can Demo

### 1. Flow Savings Automation

Prompt:

`Save 5 FLOW every Friday to 0x...`

Tools involved:

- `create_savings_plan`

Why it helps:

- Directly maps to scheduled savings / autopilot behavior in the Flow track

### 2. Flow Scheduled Payouts

Prompt:

`Pay 10 FLOW to 0x... on the first day of every month`

Tools involved:

- `schedule_payout`

Why it helps:

- Demonstrates recurring on-chain consumer payments

### 3. Flow Payroll

Prompt:

`Create a payroll plan to pay 15 FLOW biweekly to 0x...`

Tools involved:

- `create_payroll_plan`

Why it helps:

- Aligns with payroll / grants examples from the challenge brief

### 4. Flow Grants / Stipends

Prompt:

`Create a recurring grant payout of 20 FLOW every month to 0x...`

Tools involved:

- `create_grant_payout`

Why it helps:

- Shows programmable treasury-style recurring disbursements

### 5. Flow Wallet Readiness + Onboarding

Prompt:

`Is my Flow wallet ready?`

Tools involved:

- `get_flow_wallet_readiness`

Why it helps:

- Makes funding and onboarding legible for judges and users

### 6. Flow Network Explainability

Prompt:

`Show me the Flow setup in this app`

Tools involved:

- `get_flow_network_overview`

Why it helps:

- Makes the Flow integration obvious in demos and documentation

## Workflow Builder Coverage

The visual builder now exposes these Flow-first nodes:

- `create_savings_plan`
- `schedule_payout`
- `create_payroll_plan`
- `create_grant_payout`
- `get_flow_network_overview`
- `get_flow_wallet_readiness`

This means the Flow story is visible in both:

- chat-based natural language execution
- visual workflow composition

## Flow-Specific Scope

These features remain on Arbitrum Sepolia in the current build and are not part of the Flow track demo path:

- ERC-20 / ERC-721 deployment flows
- swap routes
- bridge routes
- ENS tools
- portfolio/history features that depend on Etherscan-style indexing

The Flow track implementation in this repo focuses on Flow EVM savings, payouts, payroll, grants, reminders, and wallet-readiness flows.

## Key Flow Files

Backend:

- `backend/config/constants.js`
- `backend/utils/chains.js`
- `backend/controllers/conversationController.js`
- `backend/services/toolRouter.js`
- `backend/services/directToolExecutor.js`

Frontend:

- `frontend/lib/chains.ts`
- `frontend/app/providers.tsx`
- `frontend/app/agent/[agentId]/chat/page.tsx`
- `frontend/components/workflow-builder.tsx`
- `frontend/components/node-library.tsx`

## Suggested Demo Sequence

1. Open chat with Flow selected
2. Ask `Show me the Flow setup`
3. Ask `Is my Flow wallet ready?`
4. Fund the wallet if needed from the faucet
5. Ask `Save 5 FLOW every Friday to 0x...`
6. Ask `Create a payroll plan to pay 10 FLOW every month to 0x...`
7. Show scheduled jobs in the UI
8. Show Flowscan or wallet explorer links

## Why This Helps for the Flow Track

This project now makes Flow visible at three layers:

- Infrastructure: Flow EVM RPC, explorer, faucet, and sponsored RPC wiring
- Product: savings, payouts, payroll, and grant automation
- UX: wallet readiness, chain-aware chat, and workflow builder coverage

That gives you a much stronger Flow-track story than a generic multi-chain checkbox.
