import { NextRequest, NextResponse } from 'next/server'
import { getAgentByApiKey } from '@/lib/agents'

/**
 * POST /api/agent/chat
 * 
 * This endpoint acts as a proxy between the frontend and the n8n_agent_backend.
 * It validates the agent API key and forwards the request to the AI agent backend.
 * 
 * Request body:
 * {
 *   api_key: string          // Agent API key from database
 *   user_message: string     // Natural language query from user
 *   private_key?: string     // Optional: user's wallet private key
 * }
 * 
 * Response:
 * {
 *   agent_response: string                    // AI-generated response
 *   tool_calls: Array<{tool, parameters}>     // Tools that were called
 *   results: Array<{success, tool, result}>   // Results from each tool
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { api_key, user_message, private_key } = body

    // Validate required fields
    if (!api_key) {
      return NextResponse.json(
        { error: 'Missing required field: api_key' },
        { status: 400 }
      )
    }

    if (!user_message) {
      return NextResponse.json(
        { error: 'Missing required field: user_message' },
        { status: 400 }
      )
    }

    // Verify agent exists and get agent configuration
    const agent = await getAgentByApiKey(api_key)
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_AI_AGENT_BACKEND_URL || 'http://localhost:8000'

    // Prepare request for n8n_agent_backend
    const agentBackendRequest = {
      tools: agent.tools || [],
      user_message: user_message,
      private_key: private_key || undefined
    }

    // Forward request to n8n_agent_backend
    const response = await fetch(`${backendUrl}/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentBackendRequest),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return NextResponse.json(
        { error: errorData.error || errorData.detail || 'Backend request failed' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Return the response from n8n_agent_backend
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Agent chat error:', error)
    
    // Handle specific error cases
    if (error.message?.includes('fetch')) {
      return NextResponse.json(
        { error: 'Cannot connect to AI agent backend. Please ensure it is running.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agent/chat
 * 
 * Returns information about the endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agent/chat',
    method: 'POST',
    description: 'Interact with AI agents using natural language',
    required_fields: ['api_key', 'user_message'],
    optional_fields: ['private_key'],
  })
}
