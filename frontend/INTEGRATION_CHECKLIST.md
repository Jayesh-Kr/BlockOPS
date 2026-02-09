# Quick Integration Checklist

## ✅ Setup Checklist

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env.local` in frontend directory
- [ ] Set `NEXT_PUBLIC_AI_AGENT_BACKEND_URL=http://localhost:8000`
- [ ] Set `NEXT_PUBLIC_BLOCKCHAIN_BACKEND_URL=http://localhost:3000`
- [ ] Configure Supabase URL and API key
- [ ] Configure Privy App ID

### 2. Backend Services
- [ ] Start Blockchain Backend (Port 3000)
  ```bash
  cd backend
  npm start
  ```
- [ ] Start AI Agent Backend (Port 8000)
  ```bash
  cd n8n_agent_backend
  python main.py
  ```
- [ ] Verify both services with health checks:
  ```bash
  curl http://localhost:3000/health
  curl http://localhost:8000/health
  ```

### 3. Frontend
- [ ] Start Next.js development server
  ```bash
  cd frontend
  npm run dev
  ```

### 4. Test Integration
- [ ] Create account on frontend
- [ ] Create or import wallet
- [ ] Create an agent with tools
- [ ] Send a test message (e.g., "What's the price of Bitcoin?")
- [ ] Verify response appears in chat

## 🔄 Request Flow Summary

```
User Input → Frontend Chat Page → /api/agent/chat → AI Agent Backend → Blockchain Backend → Blockchain
```

## 📝 Key Integration Points

### 1. Chat Page (`app/agent/[agentId]/chat/page.tsx`)
```typescript
import { sendAgentChatMessage } from '@/lib/backend'

// Automatically gets user's private key from database
const { dbUser } = useAuth()
const privateKey = dbUser?.private_key

// Send message to agent
const response = await sendAgentChatMessage(
  agent.api_key,
  userMessage,
  privateKey
)
```

### 2. API Route (`app/api/agent/chat/route.ts`)
```typescript
// Validates agent API key
const agent = await getAgentByApiKey(api_key)

// Forwards to AI agent backend
const response = await fetch(`${backendUrl}/agent/chat`, {
  method: 'POST',
  body: JSON.stringify({
    tools: agent.tools,
    user_message,
    private_key
  })
})
```

### 3. Backend Service (`lib/backend.ts`)
```typescript
// Main function to send chat messages
export async function sendAgentChatMessage(
  apiKey: string,
  userMessage: string,
  privateKey?: string
): Promise<AgentChatResponse>
```

## 🔧 Common Commands

### Start All Services
```bash
# Terminal 1: Blockchain Backend
cd backend && npm start

# Terminal 2: AI Agent Backend  
cd n8n_agent_backend && python main.py

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Health Checks
```bash
curl http://localhost:3000/health  # Blockchain Backend
curl http://localhost:8000/health  # AI Agent Backend
curl http://localhost:3000         # Frontend (Next.js)
```

### Test Agent Endpoint
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your_agent_api_key",
    "user_message": "What is the current price of Bitcoin?"
  }'
```

## 🐛 Debugging

### Check Backend Logs
- **AI Agent Backend**: Look for Gemini API calls and tool executions
- **Blockchain Backend**: Look for transaction hashes and blockchain calls
- **Frontend**: Check browser console for API requests

### Common Error Messages

| Error | Solution |
|-------|----------|
| "Cannot connect to AI agent backend" | Start `n8n_agent_backend` on port 8000 |
| "Backend request failed" | Start `backend` on port 3000 |
| "Invalid API key" | Verify agent exists in database |
| "Missing private key" | User needs to create/import wallet |

## 📦 File Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── agent/
│   │       └── chat/
│   │           └── route.ts          # ← API endpoint
│   └── agent/
│       └── [agentId]/
│           └── chat/
│               └── page.tsx           # ← Chat UI
├── lib/
│   ├── backend.ts                     # ← Backend service utilities
│   ├── agents.ts                      # Agent management
│   ├── wallet.ts                      # Wallet utilities
│   ├── auth.ts                        # Auth context
│   └── supabase.ts                    # Database client
└── .env.local                         # ← Environment config
```

## 🚀 Production Deployment

1. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_AI_AGENT_BACKEND_URL=https://your-ai-backend.com
   NEXT_PUBLIC_BLOCKCHAIN_BACKEND_URL=https://your-blockchain-backend.com
   ```

2. **Enable CORS** on backend services for your frontend domain

3. **Use HTTPS** for all communications

4. **Secure Private Keys** - consider additional encryption layers

## 📚 Documentation Files

- `FRONTEND_BACKEND_INTEGRATION.md` - Complete integration guide
- `BACKEND_ARCHITECTURE.md` - Backend architecture overview
- `TEST_REQUESTS.md` - Example API requests
- `INTEGRATION_CHECKLIST.md` - This file

## ✨ Next Steps

After integration is working:
1. Test all available tools (deploy_erc20, transfer, etc.)
2. Try sequential tool execution (deploy → transfer)
3. Monitor transaction confirmations on Arbitrum Sepolia explorer
4. Configure production environment variables
5. Deploy all services to production
