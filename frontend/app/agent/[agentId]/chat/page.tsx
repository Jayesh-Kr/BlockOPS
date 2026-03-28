"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Send, Loader2, ChevronDown, ChevronUp, Wrench, ArrowLeft, ArrowRight, CircleDot, Copy, Check, Star, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { UserProfile } from "@/components/user-profile"
import { useAuth } from "@/lib/auth"
import { getAgentById } from "@/lib/agents"
import { sendChatWithMemory, BLOCKCHAIN_BACKEND_URL } from "@/lib/backend"
import type { Agent } from "@/lib/supabase"
import type { AgentChatResponse } from "@/lib/types"
import { ethers } from "ethers"
import { useWallets } from "@privy-io/react-auth"
import { decryptStoredPrivateKey } from "@/lib/lit-private-key"

const DEFAULT_EMAIL_RECIPIENT_KEY = "blockops.defaultEmailRecipient"

interface ToolCallInfo {
  tool: string
  parameters: Record<string, any>
}

interface ToolResultInfo {
  success: boolean
  tool: string
  result: any
  error?: string
}

interface ToolResults {
  tool_calls: ToolCallInfo[]
  results: ToolResultInfo[]
  routing_plan?: any
  runtime?: {
    onChainId: string | null
    decision: {
      action: string
      status: string
    }
    verification: {
      allSucceeded: boolean
      verifications: Array<{
        tool: string
        txHash: string
        validationHash: string | null
        success: boolean
        blockNumber?: number
      }>
    }
    agent_log?: any
  }
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  conversationId?: string
  toolResults?: ToolResults
}

function ToolDetailsView({ toolResults }: { toolResults: ToolResults }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!toolResults?.tool_calls?.length) return null

  const runtime = toolResults.runtime

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <Wrench className="h-3 w-3" />
            <span>{toolResults.tool_calls.length} tool call{toolResults.tool_calls.length > 1 ? "s" : ""}</span>
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </CollapsibleTrigger>

        {runtime?.onChainId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20 cursor-help flex items-center gap-1">
                  <CircleDot className="h-2 w-2" />
                  ERC-8004 ID: {runtime.onChainId}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-[10px]">Registered on-chain agent identity</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {runtime?.verification?.allSucceeded && (
          <Badge variant="outline" className="text-[9px] h-4 bg-green-500/10 text-green-600 border-green-500/20 flex items-center gap-1">
            <Check className="h-2 w-2" />
            On-Chain Verified
          </Badge>
        )}
      </div>

      <CollapsibleContent className="mt-2 space-y-2">
        {toolResults.tool_calls.map((toolCall, index) => {
          const result = toolResults.results[index]
          return (
            <div key={index} className="rounded-md border border-border bg-background/50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {toolCall.tool}
                </Badge>
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {result?.success ? "ok" : "err"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-2">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Request</span>
                  <pre className="mt-1 text-[10px] font-mono text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(toolCall.parameters || {}, null, 2)}
                  </pre>
                </div>
                <div className="p-2 overflow-hidden">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Response</span>
                  <div className="mt-1 max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    <pre className="text-[10px] font-mono text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
                      {result?.error
                        ? JSON.stringify({ error: result.error }, null, 2)
                        : JSON.stringify(result?.result || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}

function formatContent(content: string): string {
  // Clean up AI thinking / reasoning that leaks into the response
  let cleaned = content
    // Remove lines like "The user wants to..." or "I need to use the send_email tool..."
    .replace(/^(The user wants to[\s\S]*?(?:\n\n|$))/m, '')
    .replace(/^(I need to use the \w+ tool[\s\S]*?(?:\n\n|$))/m, '')
    .replace(/^(I'?ll compose[\s\S]*?(?:\n\n|$))/m, '')
    // Remove standalone raw JSON blocks that aren't in code fences
    .replace(/^\{\n\s+"to":[\s\S]*?^\}$/gm, '')
    // Remove duplicate JSON echo like {"to": "...", "subject": "...", "body": "..."}
    .replace(/^\{"to":\s*"[^"]+",\s*"subject":\s*"[^"]+",\s*"(?:body|text)":\s*"[^"]*"\}$/gm, '')
    // Trim leading/trailing whitespace and collapse excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return cleaned
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-foreground/80 transition-colors">$1</a>')
    .replace(/(https?:\/\/[^\s<]+)/g, (match) => {
      if (match.includes('href="')) return match
      return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-foreground/80 transition-colors">${match}</a>`
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/```(?:json)?\n([\s\S]*?)\n```/g, (_, code) => {
      return `<pre class="mt-2 rounded border border-border bg-muted/40 p-2.5 font-mono text-[11px] overflow-x-auto leading-relaxed">${code}</pre>`
    })
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
}

export default function AgentChatPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.agentId as string
  const { logout, dbUser, privyWalletAddress, user } = useAuth()
  const { wallets } = useWallets()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [loadingAgent, setLoadingAgent] = useState(true)
  const [copiedId, setCopiedId] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [reputationScore, setReputationScore] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Function to handle MetaMask transaction signing
  const handleMetaMaskTransaction = async (txData: any): Promise<string> => {
    try {
      if (!wallets || wallets.length === 0) {
        throw new Error("No wallet connected. Please connect your wallet.")
      }

      const wallet = wallets[0]
      await wallet.switchChain(421614) // Arbitrum Sepolia

      const ethereumProvider = await wallet.getEthereumProvider()
      const provider = new ethers.BrowserProvider(ethereumProvider)
       const signer = await provider.getSigner()

      const tx = await signer.sendTransaction(txData.transaction)
      const receipt = await tx.wait()
        
        if (!receipt) throw new Error("Transaction failed to confirm")

        return receipt.hash
    } catch (error: any) {
      console.error("MetaMask transaction error:", error)
      throw new Error(`Transaction failed: ${error.message}`)
    }
  }

  useEffect(() => {
    if (agent?.on_chain_id) {
      fetchReputation(agent.on_chain_id);
    }
  }, [agent]);

  const fetchReputation = async (onChainId: string) => {
    try {
      const provider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
      const reputationAddr = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS || "0xa497e1BFe08109D60A8F91AdEc868ffdD1e0055c";
      
      const REPUTATION_ABI = [
        "function getAverageScore(uint256 agentId, string memory tag) public view returns (uint256)"
      ];

      const reputationContract = new ethers.Contract(reputationAddr, REPUTATION_ABI, provider);
      const score = await reputationContract.getAverageScore(onChainId, "successRate");
      setReputationScore(Number(score));
    } catch (e) {
      console.error("Error fetching reputation:", e);
    }
  };

  useEffect(() => {
    const fetchAgent = async () => {
      if (!agentId) { router.push("/my-agents"); return }
      try {
        const agentData = await getAgentById(agentId)
        if (!agentData) {
          toast({ title: "Agent not found", description: "The agent you're looking for doesn't exist", variant: "destructive" })
          router.push("/my-agents")
          return
        }
        setAgent(agentData)
      } catch (error: any) {
        console.error("Error loading agent:", error)
        toast({ title: "Error", description: "Failed to load agent", variant: "destructive" })
        router.push("/my-agents")
      } finally {
        setLoadingAgent(false)
      }
    }
    fetchAgent()
  }, [agentId, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!loadingAgent && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [loadingAgent])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !agent || !dbUser?.id) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    const userQuery = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      let resolvedPrivateKey: string | undefined
      if (dbUser?.private_key) {
        try {
          resolvedPrivateKey = (await decryptStoredPrivateKey(dbUser.private_key)) || undefined
        } catch (error: any) {
          console.warn("Failed to decrypt stored private key for chat request:", error)
        }
      }

      const savedEmailRecipient = typeof window !== "undefined"
        ? window.localStorage.getItem(DEFAULT_EMAIL_RECIPIENT_KEY)?.trim()
        : ""
      const effectiveDefaultEmailTo = savedEmailRecipient || user?.email?.address || undefined
      const effectiveWalletAddress = privyWalletAddress || dbUser?.wallet_address || undefined

      const data = await sendChatWithMemory({
        agentId: agent.id,
        userId: dbUser.id,
        message: userQuery,
        conversationId: conversationId,
        systemPrompt: `You are a helpful AI assistant for blockchain operations. The agent has these tools: ${agent.tools?.map((t) => t.tool).join(", ")}`,
        walletAddress: effectiveWalletAddress,
        privateKey: resolvedPrivateKey,
        defaultEmailTo: effectiveDefaultEmailTo,
        userEmail: user?.email?.address || undefined,
      })

      if (data.isNewConversation) {
        setConversationId(data.conversationId)
      }

      // Check if any tool results require MetaMask signing
      let finalMessage = data.message
      if (data.toolResults?.results) {
        for (const result of data.toolResults.results) {
          if (result.success && result.result?.requiresMetaMask && result.result?.transaction) {
            try {
              // Show signing prompt
              toast({
                title: "Transaction Signing",
                description: "Please confirm the transaction in your wallet...",
              })

              const txHash = await handleMetaMaskTransaction(result.result)
              
              // Update message with transaction hash
              const explorerUrl = `https://sepolia.arbiscan.io/tx/${txHash}`
              finalMessage += `\n\n✅ Transaction confirmed!\nTransaction Hash: [${txHash.slice(0, 10)}...${txHash.slice(-8)}](${explorerUrl})`
              
              toast({
                title: "Success",
                description: "Transaction confirmed on blockchain",
              })
            } catch (error: any) {
              finalMessage += `\n\n❌ Transaction failed: ${error.message}`
              toast({
                title: "Transaction Failed",
                description: error.message,
                variant: "destructive",
              })
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalMessage,
        timestamp: new Date(),
        conversationId: data.conversationId,
        toolResults: data.toolResults,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error.message || "Failed to get response from agent"}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      toast({ title: "Error", description: error.message || "Failed to chat with agent", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loadingAgent) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!agent) return null

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="shrink-0 border-b border-border">
          <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => router.push("/my-agents")}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Back</p></TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-[200px]">
                  {agent?.name || "Agent Chat"}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", agent ? "bg-green-500" : "bg-muted-foreground/30")} />
                    {agent ? "Online" : "Loading..."}
                  </span>
                  {reputationScore !== null && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="h-3.5 px-1 text-[9px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 flex items-center gap-0.5 cursor-help">
                          <Star className="h-2 w-2 fill-current" />
                          {reputationScore}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px] p-2 max-w-[200px]">
                        <p className="font-semibold mb-1">Decentralized Reputation</p>
                        <p className="text-muted-foreground">This score is calculated from on-chain feedback and verified execution proofs (ERC-8004).</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {agent?.on_chain_id && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className="h-3.5 px-1 text-[9px] bg-primary/10 text-primary border-primary/20 flex items-center gap-0.5 cursor-help"
                          onClick={() => window.open(`${BLOCKCHAIN_BACKEND_URL}/agents/${agent.id}/manifest`, '_blank')}
                        >
                          <ShieldCheck className="h-2 w-2" />
                          ERC-8004
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px] p-2 max-w-[200px]">
                        <p className="font-semibold mb-1">On-Chain Identity Verified</p>
                        <p className="text-muted-foreground mb-2">This agent is registered in the BlockOps Identity Registry with ID #{agent.on_chain_id}.</p>
                        <p className="text-primary hover:underline cursor-pointer">Click to view manifest</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 font-normal">
                {agent.tools?.length || 0} {(agent.tools?.length || 0) === 1 ? "tool" : "tools"}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted/60 transition-colors group/id"
                    onClick={() => {
                      navigator.clipboard.writeText(agentId as string)
                      setCopiedId(true)
                      setTimeout(() => setCopiedId(false), 2000)
                    }}
                  >
                    <code className="text-[10px] font-mono text-muted-foreground">
                      {(agentId as string).slice(0, 8)}...
                    </code>
                    {copiedId ? (
                      <Check className="h-2.5 w-2.5 text-muted-foreground" />
                    ) : (
                      <Copy className="h-2.5 w-2.5 text-muted-foreground/50 group-hover/id:text-muted-foreground transition-colors" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Copy Agent ID</p></TooltipContent>
              </Tooltip>
            </div>
            <UserProfile
              onLogout={() => {
                logout()
                router.push("/")
              }}
            />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {messages.length === 0 && (
              <div className="flex min-h-[65vh] items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border">
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Send a message to begin.</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5",
                      message.role === "user"
                        ? "bg-foreground text-background rounded-br-md"
                        : "bg-muted/60 text-foreground border border-border rounded-bl-md"
                    )}
                  >
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap [&_a]:underline [&_a]:underline-offset-2"
                      dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                    />

                    {message.role === "assistant" && message.toolResults && (
                      <ToolDetailsView toolResults={message.toolResults} />
                    )}

                    <div
                      className={cn(
                        "text-[10px] mt-1.5",
                        message.role === "user" ? "text-background/50" : "text-muted-foreground/60"
                      )}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted/60 border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Thinking…</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input */}
        <footer className="shrink-0 border-t border-border bg-background">
          <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-lg border-border bg-muted/30 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
              disabled={isLoading || !dbUser?.id}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !dbUser?.id}
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-lg bg-foreground text-background hover:bg-foreground/90"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Send</p></TooltipContent>
            </Tooltip>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}