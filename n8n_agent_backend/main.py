from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai
import json
import requests
import uvicorn

load_dotenv()

app = FastAPI(title="AI Agent Builder - Arbitrum Sepolia Edition")

# Configure Google Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# Backend URL - configurable via environment or defaults to localhost
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

# Tool Definitions
TOOL_DEFINITIONS = {
    "transfer": {
        "name": "transfer",
        "description": "Transfer tokens from one address to another. Requires privateKey, toAddress, amount, and optionally tokenAddress.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the sender wallet"},
                "toAddress": {"type": "string", "description": "Recipient wallet address"},
                "amount": {"type": "string", "description": "Amount of tokens to transfer"},
                "tokenAddress": {"type": "string", "description": "Contract address of the token (optional for ETH)"}
            },
            "required": ["privateKey", "toAddress", "amount"]
        },
        "endpoint": f"{BACKEND_URL}/transfer",
        "method": "POST"
    },
    "get_balance": {
        "name": "get_balance",
        "description": "Get ETH balance of a wallet address. Requires only the wallet address.",
        "parameters": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Wallet address to check balance"}
            },
            "required": ["address"]
        },
        "endpoint": f"{BACKEND_URL}/balance/{{address}}",
        "method": "GET"
    },
    "deploy_erc20": {
        "name": "deploy_erc20",
        "description": "Deploy a new ERC-20 token. Requires privateKey, name, symbol, and initialSupply.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the deployer wallet"},
                "name": {"type": "string", "description": "Token name"},
                "symbol": {"type": "string", "description": "Token symbol"},
                "initialSupply": {"type": "string", "description": "Initial token supply"}
            },
            "required": ["privateKey", "name", "symbol", "initialSupply"]
        },
        "endpoint": f"{BACKEND_URL}/deploy-token",
        "method": "POST"
    },
    "deploy_erc721": {
        "name": "deploy_erc721",
        "description": "Deploy a new ERC-721 NFT collection. Requires privateKey, name, and symbol.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the deployer wallet"},
                "name": {"type": "string", "description": "NFT collection name"},
                "symbol": {"type": "string", "description": "NFT collection symbol"}
            },
            "required": ["privateKey", "name", "symbol"]
        },
        "endpoint": f"{BACKEND_URL}/deploy-nft-collection",
        "method": "POST"
    },
    "fetch_price": {
        "name": "fetch_price",
        "description": "Fetch the current price of any cryptocurrency or token. Requires a query string.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query string for token price (e.g., 'bitcoin current price')"}
            },
            "required": ["query"]
        },
        "endpoint": f"{BACKEND_URL}/price/token",
        "method": "POST"
    }
}

# Pydantic Models
class ToolConnection(BaseModel):
    tool: str
    next_tool: Optional[str] = None

class AgentRequest(BaseModel):
    tools: List[ToolConnection]
    user_message: str
    private_key: Optional[str] = None

class AgentResponse(BaseModel):
    agent_response: str
    tool_calls: List[Dict[str, Any]]
    results: List[Dict[str, Any]]

# Helper Functions
def build_system_prompt(tool_connections: List[ToolConnection]) -> str:
    """Build a dynamic system prompt based on connected tools"""
    
    # Extract unique tools
    unique_tools = set()
    tool_flow = {}
    
    for conn in tool_connections:
        unique_tools.add(conn.tool)
        if conn.next_tool:
            unique_tools.add(conn.next_tool)
            tool_flow[conn.tool] = conn.next_tool
    
    # Check if sequential execution exists
    has_sequential = any(conn.next_tool for conn in tool_connections)
    
    system_prompt = """You are an AI agent for the Somnia blockchain platform. You help users perform blockchain operations using the tools available to you.

AVAILABLE TOOLS:
"""
    
    for tool_name in unique_tools:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            system_prompt += f"\n- {tool_name}: {tool_def['description']}\n"
    
    if has_sequential:
        system_prompt += "\n\nTOOL EXECUTION FLOW:\n"
        system_prompt += "Some tools are connected in sequence. You MUST execute them in the specified order:\n"
        for tool, next_tool in tool_flow.items():
            system_prompt += f"- After {tool} completes, YOU MUST IMMEDIATELY call {next_tool}\n"
        
        system_prompt += """
SEQUENTIAL EXECUTION INSTRUCTIONS - CRITICAL:
1. When tools are connected sequentially, you MUST execute ALL tools in the chain
2. After completing one tool, IMMEDIATELY proceed to call the next tool in the sequence
3. DO NOT wait for user confirmation between sequential tool calls
4. Execute all sequential tools in ONE conversation turn
5. Only provide a final summary after ALL sequential tools have been completed
6. If you have all the required parameters for the entire sequence, execute all tools immediately
"""
    else:
        system_prompt += """
INSTRUCTIONS:
1. You can perform any of the available operations based on user requests
2. Ask for required parameters if not provided
3. Execute the appropriate tool based on user needs
4. Provide clear results and next steps
"""
    
    system_prompt += """
IMPORTANT RULES:
- Only use the tools that are available to you
- Always ask for required parameters before making tool calls
- Be conversational and helpful
- If a privateKey is needed and provided in the context, use it
- Provide transaction hashes and explorer links when available
- Explain what each operation does in simple terms
- For sequential executions, complete the ENTIRE chain before responding
"""
    
    return system_prompt

def execute_tool(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool by calling its API endpoint"""
    
    if tool_name not in TOOL_DEFINITIONS:
        raise ValueError(f"Unknown tool: {tool_name}")
    
    tool_def = TOOL_DEFINITIONS[tool_name]
    endpoint = tool_def["endpoint"]
    method = tool_def["method"]
    
    # Handle URL parameters for GET requests
    if "{address}" in endpoint:
        if "address" in parameters:
            endpoint = endpoint.replace("{address}", parameters["address"])
            parameters = {}
    
    # Prepare headers - check if Bearer token is needed
    headers = {}
    if "api.subgraph.somnia.network" in endpoint:
        bearer_token = os.getenv("SOMNIA_BEARER_TOKEN")
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"
    
    try:
        if method == "POST":
            response = requests.post(endpoint, json=parameters, headers=headers, timeout=60)
        elif method == "GET":
            response = requests.get(endpoint, headers=headers, timeout=60)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return {
            "success": True,
            "tool": tool_name,
            "result": response.json()
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "tool": tool_name,
            "error": str(e)
        }

def get_openai_tools(tool_names: List[str]) -> List[Dict[str, Any]]:
    """Convert tool definitions to OpenAI function calling format"""
    
    tools = []
    for tool_name in tool_names:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            tools.append({
                "type": "function",
                "function": {
                    "name": tool_def["name"],
                    "description": tool_def["description"],
                    "parameters": tool_def["parameters"]
                }
            })
    
    return tools

def process_agent_conversation(
    system_prompt: str,
    user_message: str,
    available_tools: List[str],
    tool_flow: Dict[str, str],
    private_key: Optional[str] = None,
    max_iterations: int = 10
) -> Dict[str, Any]:
    """Process the conversation with the AI agent using Google Gemini"""
    
    # Add private key context if available
    if private_key:
        system_prompt += f"\n\nCONTEXT: User's private key is available: {private_key}"
    
    # Initialize Gemini model
    model = genai.GenerativeModel(
        model_name='gemini-2.0-flash-exp',
        generation_config={
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
        },
        tools='google_search_retrieval'  # Enable Google Search
    )
    
    # Build function declarations for Gemini
    function_declarations = []
    for tool_name in available_tools:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            function_declarations.append({
                "name": tool_def["name"],
                "description": tool_def["description"],
                "parameters": tool_def["parameters"]
            })
    
    # Start chat session
    chat = model.start_chat(history=[])
    
    all_tool_calls = []
    all_tool_results = []
    iteration = 0
    
    # Initial message
    full_prompt = f"{system_prompt}\n\nUser: {user_message}"
    
    while iteration < max_iterations:
        iteration += 1
        
        # Send message to Gemini
        response = chat.send_message(full_prompt)
        
        # Check if there are function calls
        function_calls = []
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    function_calls.append(part.function_call)
        
        # If no function calls, return final response
        if not function_calls:
            return {
                "agent_response": response.text,
                "tool_calls": all_tool_calls,
                "results": all_tool_results,
                "conversation_history": []
            }
        
        # Process function calls
        for function_call in function_calls:
            function_name = function_call.name
            function_args = dict(function_call.args)
            
            # Add private key if needed and available
            if private_key and "privateKey" in TOOL_DEFINITIONS[function_name]["parameters"]["properties"]:
                if "privateKey" not in function_args:
                    function_args["privateKey"] = private_key
            
            all_tool_calls.append({
                "tool": function_name,
                "parameters": function_args
            })
            
            # Execute the tool
            result = execute_tool(function_name, function_args)
            all_tool_results.append(result)
            
            # Send function response back to Gemini
            full_prompt = f"Function {function_name} returned: {json.dumps(result)}"
        
        # Check if we need to continue with sequential tools
        if all_tool_calls:
            last_tool_executed = all_tool_calls[-1]["tool"]
            if last_tool_executed in tool_flow:
                next_tool = tool_flow[last_tool_executed]
                full_prompt += f"\n\nIMPORTANT: You must now immediately call the {next_tool} tool as it is next in the sequential flow."
    
    # Max iterations reached
    return {
        "agent_response": "Maximum iterations reached. Please try again with a simpler request.",
        "tool_calls": all_tool_calls,
        "results": all_tool_results,
        "conversation_history": []
    }

# API Endpoints
@app.post("/agent/chat", response_model=AgentResponse)
async def chat_with_agent(request: AgentRequest):
    """
    Main endpoint to interact with the AI agent.
    Dynamically configures the agent based on tool connections.
    """
    
    try:
        # Extract unique tools and build flow map
        unique_tools = set()
        tool_flow = {}
        
        for conn in request.tools:
            unique_tools.add(conn.tool)
            if conn.next_tool:
                unique_tools.add(conn.next_tool)
                tool_flow[conn.tool] = conn.next_tool
        
        available_tools = list(unique_tools)
        
        # Validate tools
        for tool in available_tools:
            if tool not in TOOL_DEFINITIONS:
                raise HTTPException(status_code=400, detail=f"Unknown tool: {tool}")
        
        # Build system prompt
        system_prompt = build_system_prompt(request.tools)
        
        # Process conversation with sequential support
        result = process_agent_conversation(
            system_prompt=system_prompt,
            user_message=request.user_message,
            available_tools=available_tools,
            tool_flow=tool_flow,
            private_key=request.private_key
        )
        
        return AgentResponse(
            agent_response=result["agent_response"],
            tool_calls=result["tool_calls"],
            results=result["results"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Agent Builder",
        "blockchain": "Arbitrum Sepolia",
        "ai_model": "Google Gemini 2.0 Flash",
        "backend_url": BACKEND_URL
    }

@app.get("/tools")
async def list_tools():
    """List all available tools"""
    return {
        "tools": list(TOOL_DEFINITIONS.keys()),
        "details": TOOL_DEFINITIONS
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)