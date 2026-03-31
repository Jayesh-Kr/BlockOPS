# Hackathon Track Guide

This file maps BlockOps to the hackathon tracks you shared, using the project as it exists today. Use the section that matches the track you are submitting to, then keep the main [README.md](./README.md) as the product overview.

## At a Glance

| Track | Best Angle | Main Proof |
| --- | --- | --- |
| Flow | Consumer DeFi that feels simple: savings, payouts, payroll, and wallet readiness on Flow EVM | [FLOW_TRACK_FEATURES.md](./FLOW_TRACK_FEATURES.md) |
| Lit Protocol | Decentralized key management for autonomous agent wallets via PKPs and Lit Actions | [frontend/LIT_PROTOCOL_SETUP.md](./frontend/LIT_PROTOCOL_SETUP.md) |
| Filecoin | Verifiable agent logs and registry metadata stored on Filecoin Calibration with Synapse SDK | [backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md](./backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md) |
| No Humans Required / ERC-8004 | Autonomous agents with identity, manifests, structured logs, verification loops, and trust signals | [8004.md](./8004.md) |

## Flow

### Challenge Fit

BlockOps fits the Flow track as a consumer DeFi automation layer. Instead of making users think in raw transactions, it lets them express financial intent in natural language and then turns that into scheduled, repeatable flows on Flow EVM testnet.

### What to Emphasize

- Human-language financial actions
- Scheduled savings and recurring payouts
- Payroll and grant-style automation
- Wallet-readiness checks that reduce onboarding friction
- Flow-focused chat and workflow-builder support

### Current Flow Scope

- Flow EVM testnet is used for consumer DeFi automation flows.
- ERC-20 and ERC-721 deployment remain on Arbitrum Sepolia and are not part of the Flow demo path.

### Demo Path

1. Open the app with Flow selected.
2. Ask: `Show me the Flow setup`.
3. Ask: `Is my Flow wallet ready?`
4. Ask: `Save 5 FLOW every Friday to 0x...`
5. Ask: `Create a payroll plan to pay 10 FLOW every month to 0x...`
6. Show the resulting schedules and any explorer links.

### How It Matches the Brief

| Requirement / Theme | BlockOps Mapping |
| --- | --- |
| No jargon UX | Natural-language prompts and visual workflows |
| Automation | Savings plans, scheduled payouts, payroll, grants, reminders |
| Invisible complexity | Chain-aware routing plus wallet-readiness helpers |
| Consumer finance feel | Recurring financial actions instead of one-off transactions |
| Demoable product | Flow-first tools are already documented and demo-oriented |

### Submission Checklist

- Summary: explain BlockOps as consumer DeFi automation on Flow EVM
- Video: show wallet readiness, savings, and payroll flows
- GitHub: submit the repo URL from the main README
- Demo: use the live app or a local run
- Documentation: link the main README plus [FLOW_TRACK_FEATURES.md](./FLOW_TRACK_FEATURES.md)

## Lit Protocol

### Challenge Fit

BlockOps fits the Lit challenge because it treats decentralized key management as a core product layer, not a side integration. Users can create PKP wallets on Lit Naga testnet, and the app also supports Lit-encrypted traditional keys for compatibility.

### What to Emphasize

- Lit PKP wallet creation on Naga testnet
- Seedless wallet experience for autonomous agents
- Lit Actions for encryption and decryption
- Reuse of Lit-backed wallet identity across web and backend flows
- Non-custodial signing model for agent automation

### Required Technology Mapping

| Lit Requirement | BlockOps Mapping |
| --- | --- |
| Vincent API or Lit Protocol V1 (Naga) | Lit Protocol V1 (Naga) PKP flow |
| Working prototype | Wallet setup plus transaction execution in the app |
| Public source code | This repository |
| Clear README and setup | [README.md](./README.md) and [frontend/LIT_PROTOCOL_SETUP.md](./frontend/LIT_PROTOCOL_SETUP.md) |
| Demo video | Show PKP generation and PKP-backed signing |

### Demo Path

1. Open the wallet setup modal.
2. Use the `Create PKP Wallet` path.
3. Generate a PKP on Lit Naga testnet.
4. Show that only public PKP metadata is stored.
5. Trigger a transaction or agent action.
6. Explain the difference between PKP mode and Lit-encrypted traditional wallet mode.

### Submission Checklist

- Summary: explain the wallet problem and why decentralized key management matters
- Video: show PKP minting and one signed action
- GitHub: submit the repo URL from the main README
- Demo: show the wallet flow in the live app or local environment
- Documentation: link [README.md](./README.md) and [frontend/LIT_PROTOCOL_SETUP.md](./frontend/LIT_PROTOCOL_SETUP.md)

## Filecoin

### Challenge Fit

BlockOps fits the Filecoin challenge through its agent registry and immutable audit logging flow. Tool execution payloads are archived to Filecoin Calibration using Synapse SDK, and the backend exposes audit and registry routes that make those logs inspectable.

### What to Emphasize

- Structured execution logs per tool run
- Filecoin-backed audit persistence
- Synapse SDK integration for storage preparation and upload
- Calibration testnet deployment path
- Working frontend and backend demo surface

### Required Technology Mapping

| Filecoin Requirement | BlockOps Mapping |
| --- | --- |
| Must use Synapse SDK or Filecoin Pin | Uses `@filoz/synapse-sdk` |
| Must deploy to Filecoin Calibration | Audit storage path is documented for Calibration |
| Must include working demo | Web app plus backend audit endpoints |
| Open-source code on GitHub | This repository |
| Demo video | Show audit creation and Filecoin CID output |

### Best Demo Path

1. Trigger an agent tool execution from chat.
2. Show the execution audit returned by the backend.
3. Highlight the stored `filecoin_cid` or PieceCID.
4. Open the registry or audit log endpoint.
5. Explain how structured logs support verification, debugging, and agent trust.

### Judging Alignment

| Judging Criteria | BlockOps Story |
| --- | --- |
| Technical Execution | Multi-service app, agent logging, Supabase persistence, Synapse SDK archival |
| Potential Impact | Makes agent activity auditable and portable |
| Innovation / Wow Factor | Combines autonomous execution with decentralized storage-backed proofs |
| Presentation / Demo | Easy to show a tool call, a log, and a Filecoin CID in one flow |

### Submission Checklist

- Summary: explain immutable audit logging for autonomous agents
- Video: show one tool run and the resulting Filecoin-backed audit record
- GitHub: submit the repo URL from the main README
- Demo: live app plus backend audit route or local environment
- Documentation: link [README.md](./README.md) and [backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md](./backend/AGENT_REGISTRY_FILECOIN_AUDIT_README.md)

## No Humans Required / ERC-8004

### Challenge Fit

BlockOps fits this track as an agent runtime that can discover a task, select tools, execute them, verify outcomes, and leave behind machine-readable identity plus execution artifacts. The strongest version of the story is the ERC-8004 identity and trust layer paired with structured logs and a plan -> execute -> verify -> decide loop.

### Requirement Mapping

| Requirement | BlockOps Mapping |
| --- | --- |
| Autonomous execution | Documented PEVD loop and chat-driven tool orchestration |
| Agent identity | ERC-8004 identity registry plus operator wallet model |
| Capability manifest | `agent.json` pattern documented in [8004.md](./8004.md) |
| Structured execution logs | `agent_log.json` pattern plus Filecoin-backed audit logs |
| Tool use | Real blockchain tools, APIs, scheduling, and backend services |
| Safety and guardrails | Verification, retries, audit records, and documented safe-abort behavior |
| Compute budget awareness | Suitable framing via bounded tool loops and controlled orchestration |

### Bonus Fit

- ERC-8004 trust integration
- Multi-agent coordination
- Trust-gated handoffs based on agent reputation

### Demo Path

1. Start with the agent identity and operator story.
2. Trigger a natural-language task.
3. Show the plan, execution, and verification steps.
4. Highlight structured logs and audit output.
5. Show the ERC-8004 registry references and explain trust-based coordination.

### Submission Checklist

- Summary: describe BlockOps as an autonomous agent runtime with verifiable identity
- Video: show the full decision loop from prompt to verified output
- GitHub: submit the repo URL from the main README
- Demo: live app or local environment with one complete execution flow
- Documentation: link [README.md](./README.md) and [8004.md](./8004.md)

## Recommended Packaging

If you are only submitting to one track:

1. Keep [README.md](./README.md) as the main product page.
2. Use the matching track section from this file in your application form.
3. Link the deeper proof doc for that track.

If you are reusing the project across multiple submissions:

1. Keep the main README unchanged.
2. Point each submission to the relevant track section here.
3. Keep the demo video focused on that track's strongest flow.
