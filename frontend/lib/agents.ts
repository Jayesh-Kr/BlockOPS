import { BLOCKCHAIN_BACKEND_URL } from './backend'
import type { Agent } from './supabase'

type ToolConfig = Array<{ tool: string; next_tool: string | null }>

export interface AgentAuditLog {
  id: string
  agent_id: string
  user_id: string
  conversation_id: string | null
  message_excerpt: string | null
  execution_mode: string
  tool_name: string
  tool_index: number | null
  chain: string | null
  params_sanitized: Record<string, unknown>
  result_summary: Record<string, unknown>
  raw_result: unknown
  success: boolean
  tx_hash: string | null
  amount: string | null
  filecoin_cid: string | null
  filecoin_uri: string | null
  filecoin_provider: string | null
  storage_status: string
  storage_error: string | null
  created_at: string
}

export interface ListAgentAuditLogsParams {
  userId: string
  conversationId?: string
  tool?: string
  success?: boolean
  limit?: number
}

export interface AgentAuditLogContent {
  logId: string
  filecoin: {
    status: string
    provider: string
    pieceCid: string | null
    uri: string | null
    contentType?: "json" | "text"
    parseError?: string | null
  }
  envelope: unknown
  payload: unknown
  metadata: unknown
  rawText: string
}

async function parseJson(response: Response) {
  return response.json().catch(() => ({}))
}

function normalizeAgent(agent: any): Agent {
  return {
    id: agent.id,
    user_id: agent.user_id ?? agent.userId,
    name: agent.name,
    description: agent.description ?? null,
    api_key: agent.api_key ?? agent.apiKey ?? '',
    tools: Array.isArray(agent.tools) ? agent.tools : [],
    created_at: agent.created_at ?? agent.createdAt,
    updated_at: agent.updated_at ?? agent.updatedAt,
  }
}

export async function createAgent(
  userId: string,
  name: string,
  description: string | null,
  tools: ToolConfig
): Promise<Agent> {
  const response = await fetch(`${BLOCKCHAIN_BACKEND_URL}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      name,
      description,
      tools,
    }),
  })

  const payload = await parseJson(response)
  if (!response.ok || !payload.success) {
    throw new Error(`Failed to create agent: ${payload.error || `Request failed with status ${response.status}`}`)
  }

  return normalizeAgent(payload.agent)
}

export async function getAgentsByUserId(userId: string): Promise<Agent[]> {
  const response = await fetch(`${BLOCKCHAIN_BACKEND_URL}/agents?userId=${encodeURIComponent(userId)}`)
  const payload = await parseJson(response)

  if (!response.ok || !payload.success) {
    throw new Error(`Failed to fetch agents: ${payload.error || `Request failed with status ${response.status}`}`)
  }

  return Array.isArray(payload.agents) ? payload.agents.map(normalizeAgent) : []
}

export async function getAgentById(agentId: string): Promise<Agent | null> {
  const response = await fetch(`${BLOCKCHAIN_BACKEND_URL}/agents/${encodeURIComponent(agentId)}`)
  const payload = await parseJson(response)

  if (response.status === 404) {
    return null
  }

  if (!response.ok || !payload.success) {
    throw new Error(`Failed to fetch agent: ${payload.error || `Request failed with status ${response.status}`}`)
  }

  return normalizeAgent(payload.agent)
}

export async function getAgentByApiKey(apiKey: string): Promise<Agent | null> {
  throw new Error(`Failed to fetch agent: browser-side api_key lookup is not supported`)
}

export async function updateAgent(
  agentId: string,
  updates: {
    name?: string
    description?: string | null
    tools?: ToolConfig
  }
): Promise<Agent> {
  const response = await fetch(`${BLOCKCHAIN_BACKEND_URL}/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  const payload = await parseJson(response)

  if (!response.ok || !payload.success) {
    throw new Error(`Failed to update agent: ${payload.error || `Request failed with status ${response.status}`}`)
  }

  return normalizeAgent(payload.agent)
}

export async function deleteAgent(agentId: string): Promise<void> {
  const response = await fetch(`${BLOCKCHAIN_BACKEND_URL}/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  })
  const payload = await parseJson(response)

  if (!response.ok || !payload.success) {
    throw new Error(`Failed to delete agent: ${payload.error || `Request failed with status ${response.status}`}`)
  }
}

export async function listAgentAuditLogs(
  agentId: string,
  params: ListAgentAuditLogsParams
): Promise<{ logs: AgentAuditLog[]; count: number }> {
  const query = new URLSearchParams({ userId: params.userId })

  if (params.conversationId) {
    query.set('conversationId', params.conversationId)
  }

  if (params.tool) {
    query.set('tool', params.tool)
  }

  if (typeof params.success === 'boolean') {
    query.set('success', String(params.success))
  }

  if (typeof params.limit === 'number' && Number.isFinite(params.limit) && params.limit > 0) {
    query.set('limit', String(Math.floor(params.limit)))
  }

  const response = await fetch(
    `${BLOCKCHAIN_BACKEND_URL}/agents/${encodeURIComponent(agentId)}/audit-logs?${query.toString()}`
  )
  const payload = await parseJson(response)

  if (!response.ok || !payload.success) {
    throw new Error(`Failed to fetch audit logs: ${payload.error || `Request failed with status ${response.status}`}`)
  }

  return {
    logs: Array.isArray(payload.logs) ? (payload.logs as AgentAuditLog[]) : [],
    count: typeof payload.count === 'number' ? payload.count : 0,
  }
}

export async function getAgentAuditLogContent(
  agentId: string,
  logId: string,
  userId: string
): Promise<AgentAuditLogContent> {
  const query = new URLSearchParams({ userId })
  const response = await fetch(
    `${BLOCKCHAIN_BACKEND_URL}/agents/${encodeURIComponent(agentId)}/audit-logs/${encodeURIComponent(logId)}/content?${query.toString()}`
  )
  const payload = await parseJson(response)

  if (!response.ok || !payload.success) {
    throw new Error(
      `Failed to fetch stored Filecoin JSON: ${payload.error || `Request failed with status ${response.status}`}`
    )
  }

  return payload as AgentAuditLogContent
}
