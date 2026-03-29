# Agent Registry + Filecoin Audit Logging

This document explains the current implementation for immutable tool execution logging using Synapse SDK on Filecoin Calibration.

## 0. Prerequisites

- Node.js 20+
- Calibration wallet funded with:
  - tFIL (gas)
  - tUSDFC (storage payment)

## 1. Track Compliance

The backend storage path now uses Synapse SDK only.

- SDK: @filoz/synapse-sdk
- Chain: Filecoin Calibration
- Storage flow: synapse.storage.prepare() -> synapse.storage.upload()
- Content identifier: PieceCID (stored in filecoin_cid)

## 2. Environment Variables

Add these variables in backend env.

### Required for Synapse Storage

- FILECOIN_WALLET_PRIVATE_KEY
  - 32-byte hex private key (with or without 0x prefix).
  - Used to sign prepare transaction when deposit/approval is needed.
- SYNAPSE_SOURCE
  - App identifier written in metadata.
  - Example: blockops-agent-audit.

### Optional

- SYNAPSE_WITH_CDN
  - true/false flag to enable accelerated retrieval.
  - Default in current implementation: false.
- FILECOIN_PREPARE_BUFFER_BYTES
  - Optional extra buffer applied to prepare dataSize.
  - Helps avoid tiny lockup shortfalls on commit.
  - Default: 4096.

### Still Required for Persistence

- SUPABASE_URL
- SUPABASE_SERVICE_KEY

Without Supabase, audit and registry rows cannot be persisted.

## 3. Database Migration

Run migration:

- backend/database/migrations/003_agent_registry_and_filecoin_audit.sql

Tables used:

- agent_registry
- agent_tool_execution_logs

## 4. Files Added or Updated

- backend/services/filecoinStorageService.js
  - Synapse SDK client init with calibration chain.
  - 127-byte minimum upload enforcement.
  - prepare + upload workflow.
  - Returns pieceCid, uri, and optional prepareTxHash.
- backend/services/toolAuditLogService.js
  - Sanitizes params/results.
  - Archives each tool payload through filecoinStorageService.
  - Persists filecoin_cid (PieceCID), storage_status, and prepareTxHash metadata.
- backend/controllers/conversationController.js
  - Includes executionAudit in chat response.
- backend/controllers/agentRegistryController.js
  - Registry upsert/read/discovery + audit listing endpoints.
- backend/routes/agentRoutes.js
  - Registry and audit routes wired.

## 5. Runtime Flow

1. User triggers tool execution through chat.
2. Each tool call generates structured audit payload.
3. Payload is sanitized.
4. archiveJsonToFilecoin() is called.
5. Synapse prepare() computes funding/approval requirement.
6. If transaction needed, execute and capture tx hash.
7. Synapse upload() stores bytes and returns PieceCID.
8. Supabase row in agent_tool_execution_logs is written with:
   - filecoin_cid
   - filecoin_uri
   - storage_status
   - storage_error (if any)
9. Chat response returns executionAudit summary.

## 6. What Gets Logged Per Tool

- agentId
- userId
- conversationId
- timestamp
- tool
- chain
- params_sanitized
- result_summary
  - success
  - status
  - txHash
  - amount
  - prepareTxHash (when applicable)
- filecoin_cid (PieceCID)
- filecoin_uri
- storage_status
- storage_error

## 7. Verification Checklist (Calibration)

1. Fund test wallet with tFIL and tUSDFC.
2. Run a tool-triggering chat request.
3. Confirm logs include prepare transaction hash (if generated).
4. Confirm Supabase row has:
   - storage_status = stored
   - filecoin_cid starting with bafkzcib
5. Optionally perform download by PieceCID to verify retrieval bytes.

## 8. API Summary

### Registry

- GET /agents/registry/discover
- PUT /agents/:id/registry
- GET /agents/:id/registry

### Audit Logs

- GET /agents/:id/audit-logs

## 9. Setup Checklist

1. Install required SDK packages.
2. Set FILECOIN_WALLET_PRIVATE_KEY and SYNAPSE_SOURCE.
3. Run migration 003 in Supabase.
4. Restart backend.
5. Trigger tools and validate filecoin_cid + storage_status.
