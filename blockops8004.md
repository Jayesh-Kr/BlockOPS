# BlockOps ERC-8004 Integration Plan

This document outlines the implementation roadmap for integrating the **ERC-8004** (Identity, Reputation, and Validation Registries) into the BlockOps platform. This will transform BlockOps agents into verifiable, reputable, and globally discoverable on-chain economic actors.

---

## 🎯 Objectives
1.  **On-Chain Identity:** Register every BlockOps agent as an ERC-721 NFT via the ERC-8004 Identity Registry. ✅
2.  **Verifiable Reputation:** Build on-chain trust scores for agents using feedback backed by x402 payment proofs. ✅
3.  **Execution Validation:** Provide immutable proof of agent actions via the Validation Registry. ✅
4.  **Autonomous Loop:** Upgrade the agent runtime to a **Plan → Execute → Verify → Decide (PEVD)** loop. ✅
5.  **Multi-Agent Coordination:** Enable agents to discover and call each other based on reputation and trust thresholds. ✅

---

## 🛠 Phase 1: Smart Contract Layer
Deploy the core ERC-8004 infrastructure on **Arbitrum Sepolia**.

- [x] **Registries Deployment:**
    - `BlockOpsIdentityRegistry.sol` (ERC-721 based) ✅
    - `BlockOpsReputationRegistry.sol` ✅
    - `BlockOpsValidationRegistry.sol` ✅
    - `BlockOpsRegistryFactory.sol` (For unified deployment and initialization) ✅
- [x] **Initialization:** Link Reputation and Validation registries to the Identity Registry. ✅
- [x] **Deployment Script:** Hardhat script to deploy and update `.env` with new contract addresses. ✅

---

## ⚙️ Phase 2: Agent Runtime Upgrade (PEVD Loop)
Transition from simple tool routing to a robust, verifiable execution cycle in `backend/services/agentRuntime.js`.

### The 4-Loop System:
1.  **PLAN:** AI selects tools and sequences based on user intent. ✅
2.  **EXECUTE:** Run tools on-chain via `directToolExecutor.js`. ✅
3.  **VERIFY:** Check transaction receipts and post to the Validation Registry. ✅
4.  **DECIDE:** Analyze verification results to complete, retry, or escalate to a human. ✅

---

## 📊 Phase 3: Manifests & On-Chain Logging
Standardize agent metadata and execution history for external discovery.

- [x] **`agent.json` Manifest:**
    - Generate a standard manifest for every agent including capabilities, operator wallet, and registry addresses. ✅
    - Metadata URL linked to the Identity Registry NFT. ✅
- [x] **`agent_log.json` Generation:**
    - Automatically record every phase of the PEVD loop. ✅
    - Export logs as JSON for transparency and debugging. ✅
    - Include transaction hashes and validation request hashes. ✅

---

## 🤝 Phase 4: Multi-Agent Coordination (The Orchestrator)
Implement `backend/services/agentCoordinator.js` to allow agents to interact trustlessly.

- [x] **Discovery:** Query Identity Registry for agents with specific capabilities. ✅
- [x] **Trust Filtering:** Only interact with agents whose reputation score exceeds a configurable threshold (e.g., 75/100). ✅
- [x] **Payment & Handoff:** Architecture ready for x402 USDC payments between agents for task delegation. ✅

---

## 🎨 Phase 5: Frontend Enhancements
Update the BlockOps UI to reflect the new on-chain identity and reputation system.

- [x] **Agent Profile:** Show the ERC-8004 Agent ID, on-chain reputation score, and validation history. ✅
- [x] **Trust Badges:** Visual indicators of an agent's success rate and "On-Chain Verified" status. ✅
- [x] **Discovery Dashboard:** A marketplace-style view to find and call other registered agents. ✅

---

## 📜 Technical Mapping (Existing vs. New)

| Component | Current State | ERC-8004 Future |
|---|---|---|
| **Identity** | Database ID (UUID) | ERC-721 NFT on Arbitrum Sepolia |
| **Execution** | Tool Router (Plan-Execute) | PEVD Loop (Plan-Execute-Verify-Decide) |
| **Trust** | BlockOps DB records | On-Chain Reputation Registry |
| **Proof** | x402 payment hashes | Validation Registry Proofs + `agent_log.json` |
| **Discovery** | Internal to BlockOps | Globally Discoverable via Identity Registry |

---

**Status: COMPLETE** ✅

### **Deployed Registry Addresses (Arbitrum Sepolia)**
- **BlockOpsIdentityRegistry**: `0x734C984AE7d64aa917D9D2e4B9C08A0CD6C0589B`
- **BlockOpsReputationRegistry**: `0xa497e1BFe08109D60A8F91AdEc868ffdD1e0055c`
- **BlockOpsValidationRegistry**: `0xFab8731b8d1a978e78086179dC5494F0dbA1f6bE`
- **BlockOpsRegistryFactory**: `0xA8A77a933Db23eFBC39d7D3D246649BE7070Eb59`

*Updated by BlockOps Assistant · March 29, 2026*
