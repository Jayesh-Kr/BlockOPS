# BlockOps Complete System Workflow Diagrams (Current Implementation)

This document maps the current codebase behavior across frontend, backend, AI services, wallet/signing paths, ERC-8004 identity, Filecoin audit storage, scheduling, Telegram linking, and payment gating.

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Clients
        U[User]
        TG[Telegram Client]
    end

    subgraph Frontend
        FE[Next.js App]
        NAPI[Next API Routes]
    end

    subgraph Core Backend
        BE[Express Backend]
        RT[Agent Runtime PEVD]
        TR[Tool Router]
    end

    subgraph AI Services
        AGENT[AI Agent Backend FastAPI 8000]
        WF[Workflow Generator FastAPI 8001]
    end

    subgraph Data and Auth
        PRIVY[Privy]
        SUPA[Supabase]
    end

    subgraph External Protocols
        LIT[Lit Protocol Naga]
        FLOW[Flow EVM Testnet]
        ARB[Arbitrum Sepolia]
        ETHL1[Ethereum Sepolia]
        FC[Filecoin Calibration]
    end

    U --> FE
    TG --> BE
    FE <--> PRIVY
    FE <--> SUPA
    FE --> BE
    FE --> WF
    FE --> NAPI
    NAPI --> LIT
    NAPI --> ARB

    BE --> TR
    TR --> RT
    RT --> AGENT
    RT --> FLOW
    RT --> ARB
    BE --> ETHL1
    BE <--> SUPA
    BE --> LIT
    BE --> FC
```

## 2. Entry Surfaces and Routing Modes

```mermaid
flowchart TD
    START[User interaction] --> SURFACE{Surface}

    SURFACE -->|Web chat| WEBCHAT[Agent chat page]
    SURFACE -->|Workflow builder| BUILDER[Workflow builder canvas]
    SURFACE -->|Marketplace| MARKET[Marketplace page]
    SURFACE -->|Telegram| TELEGRAM[Telegram bot message]

    WEBCHAT --> API_CHAT[POST /api/chat]
    BUILDER --> WF_GEN[POST workflow generation service]
    BUILDER --> AGENT_CRUD[Agent CRUD APIs]
    MARKET --> REGISTRY_DISCOVERY[Registry and manifest discovery]
    TELEGRAM --> TG_SERVICE[telegramService mode resolver]

    TG_SERVICE --> TG_MODE{Linked agent}
    TG_MODE -->|No| TG_GENERIC[Generic mode]
    TG_MODE -->|Yes| TG_AGENT[Agent-linked mode]

    TG_GENERIC --> API_CHAT
    TG_AGENT --> API_CHAT
```

## 3. Chat Runtime Execution Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend Chat
    participant BE as Express /api/chat
    participant ROUTER as toolRouter
    participant RUNTIME as BlockOpsAgentRuntime
    participant AGENT as FastAPI /agent/chat
    participant DIRECT as directToolExecutor
    participant CHAIN as Flow or Arbitrum
    participant AUDIT as toolAuditLogService
    participant FC as Filecoin
    participant DB as Supabase

    User->>FE: Send natural-language request
    FE->>BE: sendChatWithMemory(agentId, userId, message, chain, wallet context)
    BE->>ROUTER: intelligentToolRouting(message, history, chain)
    ROUTER-->>BE: routingPlan and execution steps

    alt Off-topic or missing required info
        BE-->>FE: Clarification or off-topic response
    else Requires tool execution
        BE->>RUNTIME: run(message, routingPlan, executionFn)
        RUNTIME->>RUNTIME: ensureIdentity and checkDelegations

        alt Primary agent backend path
            RUNTIME->>AGENT: /agent/chat with tool graph and context
            AGENT-->>RUNTIME: tool_calls and results
        else Direct execution path or fallback
            RUNTIME->>DIRECT: executeToolsDirectly(routingPlan, executionContext)
            DIRECT->>CHAIN: Execute reads/writes/schedules
            CHAIN-->>DIRECT: receipts and outputs
            DIRECT-->>RUNTIME: tool_calls and results
        end

        RUNTIME->>RUNTIME: verify receipts, update reputation, decide outcome
        RUNTIME-->>BE: runtime result
        BE->>AUDIT: archiveToolExecutionLogs(...)
        AUDIT->>FC: prepare and upload JSON envelope
        AUDIT->>DB: persist agent_tool_execution_logs row
        BE->>DB: persist conversation and messages
        BE-->>FE: assistant message plus toolResults plus executionAudit
    end
```

## 4. Conversation Memory Modes

```mermaid
flowchart TD
    CHAT[Incoming /api/chat] --> CHECK{Supabase configured and IDs UUID-compatible}

    CHECK -->|Yes| PERSISTENT[Persistent mode]
    CHECK -->|No| MEMORY[In-memory mode]

    PERSISTENT --> C1[Create or load conversation row]
    C1 --> C2[Insert user message]
    C2 --> C3[Load conversation_messages history]
    C3 --> RUN[Run routing and execution]
    RUN --> C4[Insert assistant message and tool_calls]

    MEMORY --> M1[Create temp conversation key]
    M1 --> M2[Store user message in memory map]
    M2 --> RUN
    RUN --> M3[Store assistant message in memory map]
```

## 5. Wallet Setup and Signing Paths

```mermaid
flowchart TD
    SETUP[Wallet setup modal] --> MODE{Wallet mode}

    MODE -->|PKP mode| PKP_MINT[Mint PKP on Lit Naga]
    MODE -->|Traditional mode| ENC_KEY[Encrypt EOA key with Lit action]

    PKP_MINT --> STORE_PKP[Store wallet_type pkp plus wallet_address plus pkp_public_key plus pkp_token_id]
    ENC_KEY --> STORE_EOA[Store lit:v1 payload in users.private_key]

    STORE_PKP --> EXEC_REQ[Execution request]
    STORE_EOA --> EXEC_REQ

    EXEC_REQ --> SIGN_MODE{wallet_type}
    SIGN_MODE -->|pkp| PKP_SIGN[PKP signer path]
    SIGN_MODE -->|traditional| DEC_SIGN[Decrypt lit:v1 then EOA signer]

    PKP_SIGN --> BROADCAST[Broadcast tx on selected chain]
    DEC_SIGN --> BROADCAST
```

## 6. Lit Integration Route Map

```mermaid
graph LR
    UI[Wallet UI and chat signing] --> MINT["/api/lit/pkp/mint"]
    UI --> SIGN["/api/lit/pkp/sign"]
    UI --> ENC["/api/lit/private-key/encrypt"]
    UI --> DEC["/api/lit/private-key/decrypt"]

    MINT --> LIT_LIB[frontend/lib/lit-server.ts]
    SIGN --> LIT_LIB
    ENC --> LIT_LIB
    DEC --> LIT_LIB

    LIT_LIB --> LIT[Lit API and Lit Actions]

    BE[Express backend] --> LIT_PKP[backend/services/litPkpService.js]
    LIT_PKP --> LIT
```

## 7. Chain Routing and Tool Scope

```mermaid
flowchart LR
    REQUEST[Request with chain context] --> CHAIN_ROUTE[Chain-aware routing]

    CHAIN_ROUTE --> FLOW[Flow EVM Testnet]
    CHAIN_ROUTE --> ARB[Arbitrum Sepolia]

    FLOW --> FLOW_TOOLS[get_balance transfer batch_transfer deploy_erc20 deploy_erc721 schedule_transfer reminders savings payouts payroll grants gas and chain diagnostics]
    ARB --> ARB_TOOLS[swap quote bridge ens portfolio wallet_history tx_status nft mint token and nft info]

    ARB --> ETH_BRIDGE[Ethereum Sepolia bridge counterpart]
```

## 8. Scheduling and Reminder Engines

```mermaid
sequenceDiagram
    actor User
    participant API as Express schedule or reminders routes
    participant DB as Supabase
    participant CRON as In-process node-cron scheduler
    participant EXEC as directToolExecutor or transfer runner
    participant CHAIN as Flow or Arbitrum
    participant TG as Telegram delivery

    User->>API: Create schedule or reminder job
    API->>DB: Insert scheduled_transfers or scheduled_chat_reminders
    API->>CRON: Register runtime task in memory

    Note over API,CRON: On server start, reloadJobsFromDB and reloadReminderJobsFromDB rehydrate active tasks

    CRON->>EXEC: Trigger due job

    alt Scheduled transfer
        EXEC->>CHAIN: Send transfer transaction
        CHAIN-->>EXEC: tx hash or error
    else Chat reminder
        EXEC->>CHAIN: Execute read tool (balance, portfolio, price)
        CHAIN-->>EXEC: result data
    end

    EXEC->>DB: Update run metadata plus append job log row

    alt Reminder delivery platform is telegram
        EXEC->>TG: Send reminder message
    else Reminder delivery platform is web
        EXEC->>DB: Append reminder message to conversation context
    end
```

## 9. Telegram Generic and Agent-Linked Modes

```mermaid
sequenceDiagram
    actor TUser as Telegram User
    participant TG as Telegram API
    participant SVC as telegramService
    participant DB as Supabase
    participant BE as Express /api/chat

    TUser->>TG: Message or command
    TG->>SVC: /telegram/webhook update

    alt Command is /connect agentId apiKey
        SVC->>DB: Validate agent and API key hash
        SVC->>DB: Save linked_agent_id and linked_at
        SVC-->>TUser: Linked mode confirmation
    else Command is /disconnect
        SVC->>DB: Clear linked_agent_id
        SVC-->>TUser: Generic mode confirmation
    else Free text query
        SVC->>DB: Resolve linked mode and wallet context
        SVC->>BE: POST /api/chat with deliveryPlatform telegram
        BE-->>SVC: assistant response plus tool results
        SVC-->>TUser: Formatted reply
    end
```

## 10. ERC-8004 Runtime, Registry, and Trust Flow

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant AG as /agents routes
    participant RT as BlockOpsAgentRuntime
    participant ID as Identity Registry
    participant VAL as Validation Registry
    participant REP as Reputation Registry
    participant DB as Supabase

    UI->>AG: Create agent and configure tools
    UI->>AG: Optional register-on-chain request
    AG->>ID: registerAgent(owner, manifestURI)
    ID-->>AG: onChainId and tx proof
    AG->>DB: Save on_chain_id and registry proof metadata

    UI->>RT: Run task via chat execution
    RT->>RT: ensureIdentity if missing
    RT->>VAL: validationRequest for verified tx hashes
    RT->>REP: giveFeedback successRate updates
    RT->>DB: Persist runtime and tool execution references

    UI->>AG: Read /agents/:id/manifest and registry endpoints
```

## 11. Filecoin Audit Lifecycle

```mermaid
sequenceDiagram
    participant CHAT as conversationController
    participant AUDIT as toolAuditLogService
    participant FILE as filecoinStorageService
    participant SYN as Synapse SDK
    participant FC as Filecoin Calibration
    participant DB as Supabase

    CHAT->>AUDIT: archiveToolExecutionLogs(agentId, userId, toolResults)
    AUDIT->>AUDIT: Sanitize params and redact sensitive fields
    AUDIT->>FILE: archiveJsonToFilecoin(payload)
    FILE->>SYN: prepare(dataSize)
    SYN->>FC: Optional prepare transaction
    FILE->>SYN: upload(envelope bytes)
    SYN-->>FILE: pieceCid and uri
    FILE-->>AUDIT: storage status and metadata
    AUDIT->>DB: Insert agent_tool_execution_logs row
    CHAT-->>CHAT: Include execution audit summary in response
```

## 12. Agent Registry Discovery and Marketplace

```mermaid
flowchart LR
    AGENT_UI[Agent management UI] --> REG_UPSERT[PUT /agents/:id/registry]
    REG_UPSERT --> REG_DB[agent_registry table]
    REG_UPSERT --> FC_META[Filecoin metadata archive]

    MARKET_UI[Marketplace page] --> CHAIN_SCAN[Query IdentityRegistry AgentRegistered events]
    MARKET_UI --> DISCOVER[GET /agents/registry/discover]
    MARKET_UI --> MANIFEST[GET /agents/:id/manifest]

    CHAIN_SCAN --> MERGED[Merge on-chain IDs plus local metadata plus reputation scores]
    DISCOVER --> MERGED
    MANIFEST --> MERGED
    MERGED --> LISTING[Marketplace listing cards and details]
```

## 13. x402 Payment and AI Quota Gating

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant NAPI as Next payment API routes
    participant DB as Supabase
    participant ESCROW as Payment Escrow contract
    participant EXEC as Tool execution path

    User->>FE: Request premium action
    FE->>NAPI: GET /api/payments/ai-quota
    NAPI->>DB: check_ai_generation_quota()
    DB-->>NAPI: canGenerate and freeRemaining

    alt Free quota available
        FE->>EXEC: Proceed without payment
    else Payment required
        FE->>NAPI: POST /api/payments/agreement
        FE->>ESCROW: Submit payment transaction
        FE->>NAPI: POST /api/payments/verify
        NAPI->>ESCROW: verifyPayment plus getPayment
        NAPI->>DB: Upsert payments row and execution token
        NAPI-->>FE: executionToken
        FE->>EXEC: Run premium action with execution token

        alt Action success
            FE->>NAPI: POST /api/payments/execute
            NAPI->>ESCROW: executePayment(paymentId)
            NAPI->>DB: Mark payment executed
        else Action failure
            FE->>NAPI: POST /api/payments/refund
            NAPI->>ESCROW: refundPayment(paymentId)
            NAPI->>DB: Mark payment refunded
        end
    end
```

## 14. API Topology Map

```mermaid
graph TB
    subgraph NextJS_API
        N1["/api/lit/pkp/mint"]
        N2["/api/lit/pkp/sign"]
        N3["/api/lit/private-key/encrypt"]
        N4["/api/lit/private-key/decrypt"]
        N5["/api/payments/agreement"]
        N6["/api/payments/pricing"]
        N7["/api/payments/ai-quota"]
        N8["/api/payments/verify"]
        N9["/api/payments/execute"]
        N10["/api/payments/refund"]
    end

    subgraph Express_Public
        E1["/health"]
        E2["/price"]
        E3["/gas"]
        E4["/ens"]
        E5["/portfolio"]
        E6["/api/chat plus conversations"]
        E7["/transfer/prepare"]
        E8["/wallet/tx and wallet/history"]
        E9["/telegram/webhook"]
    end

    subgraph Express_Protected
        P1["/token /nft /transfer /wallet"]
        P2["/allowance /swap /bridge /chain /batch"]
        P3["/nl-executor /contract-chat /email"]
        P4["/schedule /reminders"]
        P5["/agents CRUD registry audit manifest"]
        P6["/webhooks and /telegram admin"]
    end

    subgraph FastAPI_Services
        F1[AI Agent Backend 8000: /agent/chat /create-workflow /tools /health]
        F2[Workflow Generator 8001: /create-workflow /available-tools /health]
    end

    E6 --> F1
```

## 15. Core Data Model Relationships

```mermaid
erDiagram
    USERS ||--o{ AGENTS : owns
    AGENTS ||--o{ CONVERSATIONS : serves
    CONVERSATIONS ||--o{ CONVERSATION_MESSAGES : contains

    AGENTS ||--o{ TELEGRAM_USERS : linked_to
    AGENTS ||--o{ SCHEDULED_TRANSFERS : schedules
    USERS ||--o{ SCHEDULED_CHAT_REMINDERS : creates

    AGENTS ||--o| AGENT_REGISTRY : publishes
    AGENTS ||--o{ AGENT_TOOL_EXECUTION_LOGS : emits

    USERS ||--o{ PAYMENTS : pays
    AGENTS ||--o{ PAYMENTS : billed_to
    USERS ||--o{ PAYMENT_AGREEMENTS : accepts
    USERS ||--o{ AI_GENERATION_QUOTAS : tracked_by_day

    USERS {
      text id PK
      text wallet_type
      text wallet_address
      text pkp_public_key
      text pkp_token_id
    }

    AGENTS {
      uuid id PK
      text user_id FK
      text name
      text api_key
      text on_chain_id
    }

    CONVERSATIONS {
      uuid id PK
      uuid agent_id FK
      uuid user_id FK
      text title
      int message_count
    }

    CONVERSATION_MESSAGES {
      uuid id PK
      uuid conversation_id FK
      text role
      text content
      jsonb tool_calls
    }

    AGENT_REGISTRY {
      uuid id PK
      uuid agent_id FK
      text status
            text capabilities
      text metadata_cid
    }

    AGENT_TOOL_EXECUTION_LOGS {
      uuid id PK
      text agent_id
      text tool_name
      text chain
      text filecoin_cid
      text storage_status
    }

    PAYMENTS {
      uuid id PK
      text user_id FK
      uuid agent_id FK
      text payment_hash
      text status
      text execution_token
    }

    SCHEDULED_TRANSFERS {
      uuid id PK
      text agent_id
      text chain
      text cron_expression
      text status
    }

    SCHEDULED_CHAT_REMINDERS {
      uuid id PK
      text user_id
      text task_type
      text delivery_platform
      text status
    }
```

## Summary

The current BlockOps implementation is represented as:

1. Multi-surface entry points: web chat, workflow builder, marketplace, and Telegram.
2. Chain-aware execution with Flow EVM Testnet as default and Arbitrum Sepolia for advanced tooling.
3. Runtime orchestration with ERC-8004 identity, verification, and reputation updates.
4. Dual wallet model with Lit PKP and Lit-encrypted traditional key compatibility.
5. Filecoin-backed audit logs indexed in Supabase.
6. Scheduling and reminder automation with DB reload on startup.
7. Optional x402 payment gating and AI quota enforcement through Next.js API routes.

This document is intended to match current code paths, not the older single-chain architecture.