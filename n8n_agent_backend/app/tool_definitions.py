from .config import BACKEND_URL

# Tool Definitions
TOOL_DEFINITIONS = {
    "transfer": {
        "name": "transfer",
        "description": "Prepare a transfer transaction for the user to sign with their wallet (MetaMask). Use the user's connected wallet address as fromAddress. Requires fromAddress, toAddress, amount, and optionally tokenId for ERC20 transfers (omit for native ETH).",
        "parameters": {
            "type": "object",
            "properties": {
                "fromAddress": {"type": "string", "description": "Sender wallet address (user's connected wallet)"},
                "toAddress": {"type": "string", "description": "Recipient wallet address"},
                "amount": {"type": "string", "description": "Amount of tokens to transfer"},
                "tokenId": {"type": "string", "description": "Token ID from factory (optional, for ERC20 transfers only, omit for ETH)"}
            },
            "required": ["fromAddress", "toAddress", "amount"]
        },
        "endpoint": f"{BACKEND_URL}/transfer/prepare",
        "method": "POST",
        "requires_metamask": True
    },
    "get_balance": {
        "name": "get_balance",
        "description": "Get ETH balance of a wallet address. If the user asks for 'my balance', use their connected wallet address. Otherwise, use the specified address.",
        "parameters": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Wallet address to check balance. Use the user's connected wallet address if they ask for 'my balance'."}
            },
            "required": ["address"]
        },
        "endpoint": f"{BACKEND_URL}/transfer/balance/{{address}}",
        "method": "GET"
    },
    "deploy_erc20": {
        "name": "deploy_erc20",
        "description": "Deploy a new ERC-20 token via Stylus TokenFactory. Returns a tokenId. Requires privateKey, name, symbol, and initialSupply. Optional: decimals (default 18).",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the deployer wallet"},
                "name": {"type": "string", "description": "Token name"},
                "symbol": {"type": "string", "description": "Token symbol"},
                "initialSupply": {"type": "string", "description": "Initial token supply"},
                "decimals": {"type": "number", "description": "Token decimals (optional, default 18)"}
            },
            "required": ["privateKey", "name", "symbol", "initialSupply"]
        },
        "endpoint": f"{BACKEND_URL}/token/deploy",
        "method": "POST"
    },
    "deploy_erc721": {
        "name": "deploy_erc721",
        "description": "Deploy a new ERC-721 NFT collection via Stylus NFTFactory. Requires privateKey, name, symbol, and baseURI.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the deployer wallet"},
                "name": {"type": "string", "description": "NFT collection name"},
                "symbol": {"type": "string", "description": "NFT collection symbol"},
                "baseURI": {"type": "string", "description": "Base URI for token metadata (e.g., ipfs://...)"}
            },
            "required": ["privateKey", "name", "symbol", "baseURI"]
        },
        "endpoint": f"{BACKEND_URL}/nft/deploy-collection",
        "method": "POST"
    },
    "fetch_price": {
        "name": "fetch_price",
        "description": "Fetch the current price of any cryptocurrency. Supports queries like 'bitcoin', 'ethereum price', 'btc eth sol'. Returns real-time prices from CoinGecko API with 24h change, market cap, and volume data. If vsCurrency is not provided, it defaults to 'usd'.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query string for cryptocurrency (e.g., 'bitcoin', 'ethereum price', 'btc eth sol')"},
                "vsCurrency": {"type": "string", "description": "Currency to show price in (e.g., 'usd', 'eur', 'inr'). Defaults to 'usd' if not provided."}
            },
            "required": ["query"]
        },
        "endpoint": f"{BACKEND_URL}/price/token",
        "method": "POST"
    },
    "get_token_info": {
        "name": "get_token_info",
        "description": "Get detailed information about a deployed token using its tokenId. Returns name, symbol, decimals, total supply, and creator.",
        "parameters": {
            "type": "object",
            "properties": {
                "tokenId": {"type": "string", "description": "The token ID returned from deployment"}
            },
            "required": ["tokenId"]
        },
        "endpoint": f"{BACKEND_URL}/token/info/{{tokenId}}",
        "method": "GET"
    },
    "get_token_balance": {
        "name": "get_token_balance",
        "description": "Get token balance for a specific address. Requires tokenId and ownerAddress.",
        "parameters": {
            "type": "object",
            "properties": {
                "tokenId": {"type": "string", "description": "The token ID"},
                "ownerAddress": {"type": "string", "description": "Wallet address to check balance"}
            },
            "required": ["tokenId", "ownerAddress"]
        },
        "endpoint": f"{BACKEND_URL}/token/balance/{{tokenId}}/{{ownerAddress}}",
        "method": "GET"
    },
    "mint_nft": {
        "name": "mint_nft",
        "description": "Mint a new NFT in an existing collection. Requires privateKey, collectionAddress, and toAddress.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the collection creator"},
                "collectionAddress": {"type": "string", "description": "NFT collection contract address"},
                "toAddress": {"type": "string", "description": "Recipient wallet address"}
            },
            "required": ["privateKey", "collectionAddress", "toAddress"]
        },
        "endpoint": f"{BACKEND_URL}/nft/mint",
        "method": "POST"
    },
    "get_nft_info": {
        "name": "get_nft_info",
        "description": "Get information about a specific NFT. Requires collectionAddress and tokenId.",
        "parameters": {
            "type": "object",
            "properties": {
                "collectionAddress": {"type": "string", "description": "NFT collection contract address"},
                "tokenId": {"type": "string", "description": "Token ID within the collection"}
            },
            "required": ["collectionAddress", "tokenId"]
        },
        "endpoint": f"{BACKEND_URL}/nft/info/{{collectionAddress}}/{{tokenId}}",
        "method": "GET"
    },
    "send_email": {
        "name": "send_email",
        "description": "Send an email to one or more recipients. You MUST use this tool (function call) to send emails — do NOT just compose JSON text. Extract the recipient from the user's message, generate a professional subject line and body, then call this function. The email will be sent via Gmail SMTP.",
        "parameters": {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient email address(es), comma-separated for multiple"},
                "subject": {"type": "string", "description": "Email subject line — generate a clear, professional subject based on the user's intent"},
                "text": {"type": "string", "description": "Plain text email body — compose a professional, friendly message based on the user's request"},
                "html": {"type": "string", "description": "HTML email body (optional, use for rich formatting)"},
                "cc": {"type": "string", "description": "CC recipients (optional)"},
                "bcc": {"type": "string", "description": "BCC recipients (optional)"},
                "replyTo": {"type": "string", "description": "Reply-to address (optional)"}
            },
            "required": ["to", "subject", "text"]
        },
        "endpoint": f"{BACKEND_URL}/email/send",
        "method": "POST"
    },
    "calculate": {
        "name": "calculate",
        "description": "Perform mathematical calculations with support for variables. IMPORTANT: The variable names used in the 'expression' MUST exactly match the keys in the 'variables' parameter. For example, if the expression uses 'arb_price', the variables dict must include 'arb_price' (not 'arbitrum_price'). Common variable names: eth_balance, eth_price, token_price. Always include ALL variables referenced in the expression.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Math expression using variable names that EXACTLY match the keys in the 'variables' dict. Example: '(eth_balance * eth_price) / token_price'"},
                "variables": {"type": "object", "description": "A dictionary mapping EVERY variable name used in the expression to its numeric value. Keys MUST match the names in the expression exactly. Example: {'eth_balance': 0.1, 'eth_price': 2500.50, 'token_price': 0.10}"},
                "description": {"type": "string", "description": "A brief description of what is being calculated"}
            },
            "required": ["expression"]
        },
        "endpoint": "local",
        "method": "LOCAL"
    }
}

