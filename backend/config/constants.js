// Network and Contract Configuration
require('dotenv').config();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const CHAIN_CONFIGS = {
  'flow-testnet': {
    id: 'flow-testnet',
    name: 'Flow EVM Testnet',
    shortName: 'Flow Testnet',
    chainId: 545,
    rpcUrl:
      process.env.FLOW_EVM_TESTNET_SPONSORED_RPC_URL ||
      process.env.FLOW_EVM_TESTNET_RPC_URL ||
      process.env.NEXT_PUBLIC_FLOW_EVM_TESTNET_RPC_URL ||
      'https://testnet.evm.nodes.onflow.org',
    sponsoredRpcUrl:
      process.env.FLOW_EVM_TESTNET_SPONSORED_RPC_URL ||
      process.env.NEXT_PUBLIC_FLOW_EVM_TESTNET_SPONSORED_RPC_URL ||
      null,
    explorerBaseUrl:
      process.env.FLOW_EVM_TESTNET_EXPLORER_URL ||
      process.env.NEXT_PUBLIC_FLOW_EVM_TESTNET_EXPLORER_URL ||
      'https://evm-testnet.flowscan.io',
    nativeCurrency: {
      name: 'Flow',
      symbol: 'FLOW',
      decimals: 18
    },
    tokenFactoryAddress:
      process.env.FLOW_TOKEN_FACTORY_ADDRESS ||
      process.env.FLOW_EVM_TESTNET_TOKEN_FACTORY_ADDRESS ||
      ZERO_ADDRESS,
    nftFactoryAddress:
      process.env.FLOW_NFT_FACTORY_ADDRESS ||
      process.env.FLOW_EVM_TESTNET_NFT_FACTORY_ADDRESS ||
      ZERO_ADDRESS
  },
  'arbitrum-sepolia': {
    id: 'arbitrum-sepolia',
    name: 'Arbitrum Sepolia',
    shortName: 'Arbitrum',
    chainId: 421614,
    rpcUrl:
      process.env.ARBITRUM_SEPOLIA_RPC_URL ||
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
      'https://sepolia-rollup.arbitrum.io/rpc',
    sponsoredRpcUrl: null,
    explorerBaseUrl:
      process.env.ARBITRUM_SEPOLIA_EXPLORER_URL ||
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_EXPLORER_URL ||
      'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    tokenFactoryAddress:
      process.env.TOKEN_FACTORY_ADDRESS ||
      ZERO_ADDRESS,
    nftFactoryAddress:
      process.env.NFT_FACTORY_ADDRESS ||
      ZERO_ADDRESS
  }
};

const CHAIN_ALIASES = {
  flow: 'flow-testnet',
  'flow-evm': 'flow-testnet',
  'flow-evm-testnet': 'flow-testnet',
  'flow testnet': 'flow-testnet',
  '545': 'flow-testnet',
  flowtestnet: 'flow-testnet',
  arbitrum: 'arbitrum-sepolia',
  arb: 'arbitrum-sepolia',
  'arb-sepolia': 'arbitrum-sepolia',
  'arbitrum sepolia': 'arbitrum-sepolia',
  '421614': 'arbitrum-sepolia'
};

function normalizeChainId(chain) {
  if (!chain) return process.env.DEFAULT_CHAIN_ID || 'flow-testnet';
  const normalized = String(chain).trim().toLowerCase();
  if (CHAIN_CONFIGS[normalized]) {
    return normalized;
  }

  return CHAIN_ALIASES[normalized] || 'flow-testnet';
}

function getChainConfig(chain) {
  const chainId = normalizeChainId(chain);
  return CHAIN_CONFIGS[chainId] || CHAIN_CONFIGS['flow-testnet'];
}

function getSupportedChains() {
  return Object.values(CHAIN_CONFIGS);
}

const DEFAULT_CHAIN = normalizeChainId(process.env.DEFAULT_CHAIN_ID || 'flow-testnet');
const DEFAULT_CHAIN_CONFIG = getChainConfig(DEFAULT_CHAIN);
const ARBITRUM_SEPOLIA_CHAIN = getChainConfig('arbitrum-sepolia');
const FLOW_TESTNET_CHAIN = getChainConfig('flow-testnet');

module.exports = {
  // Network Configuration
  CHAIN_CONFIGS,
  DEFAULT_CHAIN,
  DEFAULT_CHAIN_CONFIG,
  ARBITRUM_SEPOLIA_CHAIN,
  FLOW_TESTNET_CHAIN,
  normalizeChainId,
  getChainConfig,
  getSupportedChains,
  ARBITRUM_SEPOLIA_RPC: ARBITRUM_SEPOLIA_CHAIN.rpcUrl,
  FLOW_EVM_TESTNET_RPC: FLOW_TESTNET_CHAIN.rpcUrl,
  FLOW_EVM_TESTNET_SPONSORED_RPC_URL: FLOW_TESTNET_CHAIN.sponsoredRpcUrl,
  NETWORK_NAME: DEFAULT_CHAIN_CONFIG.name,
  EXPLORER_BASE_URL: DEFAULT_CHAIN_CONFIG.explorerBaseUrl,

  // Contract Addresses
  FACTORY_ADDRESS: ARBITRUM_SEPOLIA_CHAIN.tokenFactoryAddress,
  NFT_FACTORY_ADDRESS: ARBITRUM_SEPOLIA_CHAIN.nftFactoryAddress,

  // Server Configuration
  PORT: process.env.PORT || 3000,

  // API Keys
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY || '',
  PINATA_API_KEY: process.env.PINATA_API_KEY || '',
  PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY || '',
  MASTER_API_KEY: process.env.MASTER_API_KEY || '',

  // Etherscan V2 API Configuration
  ETHERSCAN_V2_BASE_URL: 'https://api.etherscan.io/v2/api',
  ARBITRUM_SEPOLIA_CHAIN_ID: ARBITRUM_SEPOLIA_CHAIN.chainId,
  FLOW_EVM_TESTNET_CHAIN_ID: FLOW_TESTNET_CHAIN.chainId
};
