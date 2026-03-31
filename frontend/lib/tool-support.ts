export type ToolChainSupport = "both" | "flow" | "arbitrum"

export const TOOL_CHAIN_SUPPORT: Record<string, ToolChainSupport> = {
  transfer: "both",
  batch_transfer: "both",
  get_balance: "both",
  fetch_price: "both",
  send_email: "both",
  create_savings_plan: "flow",
  schedule_payout: "flow",
  create_payroll_plan: "flow",
  create_grant_payout: "flow",
  get_flow_network_overview: "flow",
  get_flow_wallet_readiness: "flow",
  deploy_erc20: "both",
  deploy_erc721: "both",
  swap: "arbitrum",
  create_dao: "arbitrum",
  airdrop: "arbitrum",
  deposit_yield: "arbitrum",
  wrap_eth: "arbitrum",
  token_metadata: "arbitrum",
  tx_status: "arbitrum",
  wallet_history: "arbitrum",
  approve_token: "arbitrum",
  revoke_approval: "arbitrum",
}

export function getToolSupportMeta(toolType?: string): {
  label: string
  className: string
} {
  const support = TOOL_CHAIN_SUPPORT[toolType || ""] || "both"

  switch (support) {
    case "flow":
      return {
        label: "Flow only",
        className: "border-[#00EF8B] bg-[#00EF8B]/10 text-[#00EF8B]",
      }
    case "arbitrum":
      return {
        label: "Arbitrum only",
        className: "border-[#289FEF] bg-[#289FEF]/10 text-[#289FEF]",
      }
    default:
      return {
        label: "Both",
        className: "border-slate-200 bg-slate-50 text-slate-700",
      }
  }
}
