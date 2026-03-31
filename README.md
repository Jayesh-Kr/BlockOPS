# BlockOps

BlockOps is a no-code, AI-powered agent platform for consumer DeFi and onchain operations. Users can describe an action in plain English or assemble it visually, and BlockOps handles planning, execution, verification, and logging across supported chains and services.

This README covers the product, architecture, setup, and proof links. Track-specific positioning lives in [HACKATHON_TRACKS.md](./HACKATHON_TRACKS.md).

## Submission Links

| Item | Link |
| --- | --- |
| Summary | This README |
| GitHub | [github.com/Jayesh-Kr/pl-genisis](https://github.com/Jayesh-Kr/pl-genisis) |
| Live Demo | [blockops.in](https://blockops.in) |
| Backup Demo | [blockops.vercel.app](https://blockops.vercel.app/) |
| Demo Video | [Google Drive folder](https://drive.google.com/drive/folders/137-DEv4MkspcmfuAN-ETsxpGMqzmZeZl?usp=sharing) |
| Track Documentation | [HACKATHON_TRACKS.md](./HACKATHON_TRACKS.md) |
| Architecture Diagram | [WORKFLOW_DIAGRAM.md](./WORKFLOW_DIAGRAM.md) |

## What BlockOps Does

- Turns natural-language prompts into executable blockchain workflows.
- Lets users build agents visually with a drag-and-drop workflow canvas.
- Supports autonomous multi-step execution, verification, and structured logging.
- Adds invisible security layers such as Lit-backed key management and Filecoin audit storage.
- Exposes agents through a web UI, chat interface, and backend APIs.

## Why It Matters

Most crypto automation products still feel like developer tools. They expect users to understand wallets, gas, RPCs, and raw transaction flows. BlockOps is designed to make autonomous onchain actions feel more like modern consumer software:

- plain-English financial actions
- reusable no-code workflows
- wallet-aware automation
- trust and auditability built into the runtime

## Hackathon Track Fit

BlockOps can be positioned for multiple tracks from the same codebase:

| Track | Why It Fits | Supporting Docs |
| --- | --- | --- |
| Flow | Consumer DeFi automation on Flow EVM testnet with scheduled savings, payouts, payroll, and wallet-readiness flows | [FLOW_TRACK_FEATURES.md](./FLOW_TRACK_FEATURES.md) |
| Lit Protocol | Decentralized key management with Lit PKPs on Naga plus Lit Actions for encrypted key handling | [frontend/LIT_PROTOCOL_SETUP.md](./frontend/LIT_PROTOCOL_SETUP.md) |
| Filecoin | Immutable structured execution logs stored on Filecoin Calibration using Synapse SDK | [backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md](./backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md) |
| No Humans Required / ERC-8004 | Autonomous decision loops, agent identity, manifests, execution logs, and trust-based coordination | [8004.md](./8004.md) |

For a track-by-track narrative, demo plan, and submission checklist, use [HACKATHON_TRACKS.md](./HACKATHON_TRACKS.md).

## Core Capabilities

| Capability | What Judges See |
| --- | --- |
| AI workflow generation | A user describes a task in natural language and BlockOps selects tools plus execution order |
| Visual builder | A drag-and-drop canvas for composing multi-step agent workflows |
| Blockchain execution | Transfers, token flows, scheduling, and other onchain actions routed through backend services |
| Agent identity | ERC-8004 identity, reputation, and validation flows for agents |
| Auditability | Structured execution logs with Filecoin-backed persistence |
| Security | Lit-backed PKP wallets and encrypted private key support |
| Multi-surface access | Web app, chat-driven execution, and backend-triggered workflows |

## Network and Protocol Coverage

| Network / Protocol | Role in BlockOps |
| --- | --- |
| Flow EVM Testnet | Consumer DeFi demos such as savings, payouts, payroll, grants, and wallet-readiness checks |
| Arbitrum Sepolia | Primary EVM execution environment for agent actions, Stylus contracts, x402 payments, and ERC-8004 registries |
| Lit Naga Testnet | PKP minting and decentralized key management |
| Filecoin Calibration | Immutable audit log storage using Synapse SDK |

## Onchain Proofs

| Integration | Address / Reference |
| --- | --- |
| Payment Escrow | [`0x185eba222e50dedae23a411bbbe5197ed9097381`](https://sepolia.arbiscan.io/address/0x185eba222e50dedae23a411bbbe5197ed9097381) |
| ERC-8004 Identity Registry | `0x734C984AE7d64aa917D9D2e4B9C08A0CD6C0589B` |
| ERC-8004 Reputation Registry | `0xa497e1BFe08109D60A8F91AdEc868ffdD1e0055c` |
| ERC-8004 Validation Registry | `0xFab8731b8d1a978e78086179dC5494F0dbA1f6bE` |

## Architecture

### Product Layers

| Layer | Stack | Notes |
| --- | --- | --- |
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, React Flow, Privy, Supabase | User onboarding, agent builder, chat UI, wallet setup |
| Backend API | Express.js, ethers.js, viem, Supabase | Tool execution, agent registry, scheduling, audit logging |
| AI Agent Service | Python FastAPI | Chat-driven agent execution and tool orchestration |
| Workflow Generator | Python FastAPI | Natural-language to workflow conversion |
| Smart Contracts | Arbitrum Stylus (Rust) and Solidity | Token, NFT, payment, and registry infrastructure |

### Runtime Pattern

BlockOps is built around an autonomous execution loop:

`discover -> plan -> execute -> verify -> log`

For ERC-8004-oriented submissions, the repo documentation also frames this as:

`plan -> execute -> verify -> decide`

Both narratives reflect the same product goal: agents that can operate with minimal human intervention while still exposing traceable outputs.

## Repository Structure

```text
BlockOPs/
|-- frontend/             Next.js application and UI
|-- backend/              Express API, agent registry, audit logging, scheduling
|-- AI_workflow_backend/  FastAPI workflow generator service
|-- n8n_agent_backend/    FastAPI chat and execution service
|-- contract/             Stylus and Solidity contracts
|-- FLOW_TRACK_FEATURES.md
|-- HACKATHON_TRACKS.md
|-- WORKFLOW_DIAGRAM.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.9+
- Docker and Docker Compose for the Python services
- Supabase project
- RPC and API keys for the networks and services you want to demo

### Environment Setup

Create local env files from the examples:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp AI_workflow_backend/.env.example AI_workflow_backend/.env
cp n8n_agent_backend/.env.example n8n_agent_backend/.env
```

Important config groups used by this repo:

- `frontend/.env.local`
  - Privy
  - Supabase
  - frontend API URLs
  - Lit settings
- `backend/.env`
  - RPC URLs
  - registry and contract addresses
  - Groq / Gemini / OpenAI keys
  - Supabase service key
  - Filecoin Synapse configuration
  - Lit and Telegram settings
- `AI_workflow_backend/.env`
  - Groq / Gemini keys for workflow generation
- `n8n_agent_backend/.env`
  - Groq / Gemini keys
  - backend URL for tool execution

### Run the Frontend

```bash
cd frontend
npm install
npm run dev -- --port 3001
```

Recommended local URL: `http://localhost:3001`

### Run the Backend

```bash
cd backend
npm install
npm run dev
```

Default local URL: `http://localhost:3000`

### Run the AI Agent Service

```bash
cd n8n_agent_backend
docker compose up --build
```

Default local URL: `http://localhost:8000`

### Run the Workflow Generator

```bash
cd AI_workflow_backend
docker compose up --build
```

Default local URL: `http://localhost:8001`

### Optional Root Helper Script

For Unix-like environments, the repo includes `start-all.sh` and `stop-all.sh`. The helper script keeps the backend on port `3000` and starts the frontend on port `3001`.

## Demo-Ready User Flows

These are the clearest flows to show in a hackathon demo:

1. Create or load an agent wallet.
2. Ask the agent to perform an onchain task in natural language.
3. Show the selected tools, execution result, and verification output.
4. Open the track-specific proof:
   - Flow scheduling and wallet-readiness
   - Lit PKP or encrypted-key flow
   - Filecoin audit log
   - ERC-8004 registry and trust evidence

## Documentation Map

| Document | Purpose |
| --- | --- |
| [HACKATHON_TRACKS.md](./HACKATHON_TRACKS.md) | Track-by-track submission framing and demo plans |
| [FLOW_TRACK_FEATURES.md](./FLOW_TRACK_FEATURES.md) | Flow consumer DeFi positioning |
| [frontend/LIT_PROTOCOL_SETUP.md](./frontend/LIT_PROTOCOL_SETUP.md) | Lit setup and wallet architecture |
| [backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md](./backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md) | Filecoin audit logging details |
| [8004.md](./8004.md) | ERC-8004 setup, requirement mapping, and execution model |
| [WORKFLOW_DIAGRAM.md](./WORKFLOW_DIAGRAM.md) | Architecture and flow diagrams |

## License

MIT
