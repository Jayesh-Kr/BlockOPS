const {
  DEFAULT_CHAIN,
  getChainConfig,
  getSupportedChains,
  normalizeChainId
} = require('../config/constants');

const FLOW_SUPPORTED_TOOLS = new Set([
  'get_balance',
  'transfer',
  'batch_transfer',
  'lookup_transaction',
  'lookup_block',
  'fetch_events',
  'decode_revert',
  'estimate_gas',
  'simulate_gas',
  'schedule_transfer',
  'schedule_reminder',
  'list_reminders',
  'cancel_reminder',
  'list_schedules',
  'cancel_schedule',
  'create_savings_plan',
  'schedule_payout',
  'create_payroll_plan',
  'create_grant_payout',
  'get_flow_network_overview',
  'get_flow_wallet_readiness'
]);

const ARBITRUM_ONLY_TOOLS = new Set([
  'deploy_erc20',
  'deploy_erc721',
  'mint_nft',
  'batch_mint',
  'get_portfolio',
  'resolve_ens',
  'reverse_ens',
  'swap_tokens',
  'get_swap_quote',
  'bridge_deposit',
  'bridge_withdraw',
  'bridge_status',
  'wallet_history',
  'tx_status',
  'get_token_info',
  'get_token_balance',
  'get_nft_info'
]);

function getChainFromRequest(req, fallback = DEFAULT_CHAIN) {
  return normalizeChainId(
    req?.body?.chain ||
    req?.query?.chain ||
    req?.params?.chain ||
    fallback
  );
}

function getChainMetadata(chain) {
  const config = getChainConfig(chain);
  return {
    chain: config.id,
    chainId: config.chainId,
    network: config.name,
    nativeCurrency: config.nativeCurrency.symbol,
    explorerBaseUrl: config.explorerBaseUrl
  };
}

function isFlowChain(chain) {
  return normalizeChainId(chain) === 'flow-testnet';
}

function isArbitrumChain(chain) {
  return normalizeChainId(chain) === 'arbitrum-sepolia';
}

function isToolSupportedOnChain(tool, chain) {
  const normalizedTool = String(tool || '').trim();
  if (!normalizedTool) return false;
  if (isFlowChain(chain)) {
    return FLOW_SUPPORTED_TOOLS.has(normalizedTool);
  }
  return true;
}

function buildUnsupportedToolError(tool, chain) {
  const config = getChainConfig(chain);
  return `${tool} is not supported on ${config.name} yet. This tool is available on Arbitrum Sepolia only in the current hackathon build.`;
}

module.exports = {
  ARBITRUM_ONLY_TOOLS,
  FLOW_SUPPORTED_TOOLS,
  buildUnsupportedToolError,
  getChainFromRequest,
  getChainMetadata,
  getSupportedChains,
  isArbitrumChain,
  isFlowChain,
  isToolSupportedOnChain,
  normalizeChainId
};
