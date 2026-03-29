import { BLOCKCHAIN_BACKEND_URL, BLOCKCHAIN_API_KEY } from './backend'
import type { Agent } from './supabase'

type ToolConfig = Array<{ tool: string; next_tool: string | null }>

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
    on_chain_id: agent.on_chain_id ?? agent.onChainId ?? null,
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
      'x-api-key': BLOCKCHAIN_API_KEY,
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
  const response = await fetch(`${BLOCKCHAIN_BACKEND_URL}/agents?userId=${encodeURIComponent(userId)}`, {
    headers: {
      'x-api-key': BLOCKCHAIN_API_KEY,
    }
  })
  const payload = await parseJson(response)

  if (!response.ok || !payload.success) {
    throw new Error(`Failed to fetch agents: ${payload.error || `Request failed with status ${response.status}`}`)
  }

  return Array.isArray(payload.agents) ? payload.agents.map(normalizeAgent) : []
}

export async function getAgentById(agentId: string): Promise<Agent | null> {
  const response = await fetch(`${BLOCKCHAIN_BACKEND_URL}/agents/${encodeURIComponent(agentId)}`, {
    headers: {
      'x-api-key': BLOCKCHAIN_API_KEY,
    }
  })
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
      'x-api-key': BLOCKCHAIN_API_KEY,
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
    headers: {
      'x-api-key': BLOCKCHAIN_API_KEY,
    }
  })
  const payload = await parseJson(response)

  if (!response.ok || !payload.success) {
    throw new Error(`Failed to delete agent: ${payload.error || `Request failed with status ${response.status}`}`)
  }
}
