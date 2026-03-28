"use client"

import { useState, useEffect } from "react"
import { 
  Search, 
  Filter, 
  Star, 
  ShieldCheck, 
  Bot, 
  ArrowRight,
  Loader2,
  Trophy,
  Zap,
  Globe,
  FileJson,
  Check,
  Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { UserProfile } from "@/components/user-profile"
import { useAuth } from "@/lib/auth"
import { getAgentsByUserId } from "@/lib/agents"
import { ethers } from "ethers"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"

// Mock data for registered agents (In a real app, this would fetch from the Identity/Reputation registries)
const MOCK_REGISTERED_AGENTS = [
  {
    id: "2",
    name: "Uniswap V3 Optimizer",
    description: "Analyzes liquidity pools and executes optimal swaps with minimum slippage.",
    onChainId: "2",
    score: 95,
    executions: 856,
    capabilities: ["swap-tokens", "price-analysis", "liquidity-management"],
    owner: "0xabcd...efgh",
    price: "2 USDC"
  },
  {
    id: "3",
    name: "NFT Batch Minter",
    description: "High-speed agent for minting large collections to multiple addresses in one run.",
    onChainId: "3",
    score: 92,
    executions: 310,
    capabilities: ["batch-mint", "ipfs-upload", "erc721-deploy"],
    owner: "0x9876...4321",
    price: "1 USDC"
  },
  {
    id: "4",
    name: "Yield Harvester",
    description: "Automatically claims and reinvests rewards across multiple DeFi protocols.",
    onChainId: "4",
    score: 89,
    executions: 2100,
    capabilities: ["contract-call", "reward-claim", "auto-compound"],
    owner: "0xdef0...1234",
    price: "Free"
  }
];

export default function MarketplacePage() {
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>(MOCK_REGISTERED_AGENTS);
  const [selectedAgentForManifest, setSelectedAgentForManifest] = useState<any | null>(null);
  const [manifestDialogOpen, setManifestDialogOpen] = useState(false);

  useEffect(() => {
    fetchOnChainAgents();
  }, []);

  const fetchOnChainAgents = async () => {
    setLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
      const reputationAddr = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS || "0xa497e1BFe08109D60A8F91AdEc868ffdD1e0055c";
      
      const REPUTATION_ABI = [
        "function getAverageScore(uint256 agentId, string memory tag) public view returns (uint256)"
      ];

      const reputationContract = new ethers.Contract(reputationAddr, REPUTATION_ABI, provider);

      // Update mock agents with real on-chain reputation if possible
      const updatedAgents = await Promise.all(MOCK_REGISTERED_AGENTS.map(async (agent) => {
        try {
          const score = await reputationContract.getAverageScore(agent.onChainId, "successRate");
          return { ...agent, score: Number(score) > 0 ? Number(score) : agent.score };
        } catch (e) {
          return agent;
        }
      }));

      setAgents(updatedAgents);
    } catch (error) {
      console.error("Error fetching on-chain data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewManifest = (agent: any) => {
    // Generate a standard agent.json manifest for the UI
    const manifest = {
      name: agent.name,
      version: "1.0.0",
      description: agent.description,
      author: "BlockOps",
      erc8004: {
        identityRegistry: "eip155:421614:0xIdentityRegistry",
        reputationRegistry: "eip155:421614:0xReputationRegistry",
        validationRegistry: "eip155:421614:0xValidationRegistry",
        agentId: agent.onChainId,
        operatorWallet: agent.owner
      },
      capabilities: agent.capabilities,
      trustModel: ["reputation", "crypto-economic"],
      paymentProtocol: "x402",
      chain: {
        name: "Arbitrum Sepolia",
        chainId: 421614
      }
    };
    setSelectedAgentForManifest(manifest);
    setManifestDialogOpen(true);
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.capabilities.some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background font-aeonik">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">BlockOps</span>
            </Link>
            <Separator orientation="vertical" className="mx-2 h-6" />
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-medium">
              Marketplace
            </Badge>
          </div>
          <UserProfile onLogout={logout} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Discover Trusted Agents
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Find and call verifiable, reputable on-chain agents registered via ERC-8004. 
            Automate your Web3 workflow with the best in the ecosystem.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, capability, or description..." 
              className="pl-10 h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {["All", "DeFi", "L3/Infrastructure", "NFTs", "Utility", "High Reputation"].map((cat) => (
            <Badge 
              key={cat} 
              variant="secondary" 
              className="px-4 py-1.5 cursor-pointer hover:bg-muted transition-colors text-xs font-medium"
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Agent Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Syncing with ERC-8004 Identity Registry...</p>
          </div>
        ) : filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="group hover:border-primary/50 transition-all duration-300 overflow-hidden border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                      <Bot className="h-6 w-6 text-foreground/70 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-yellow-500 font-bold text-sm bg-yellow-500/10 px-2 py-0.5 rounded-full">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {agent.score}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">
                        {agent.executions} runs
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl">{agent.name}</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.capabilities.map((cap: string) => (
                      <Badge key={cap} variant="outline" className="text-[10px] font-mono py-0 h-5 bg-muted/30">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-muted/40 border border-border/40">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <span>ERC-8004 ID: {agent.onChainId}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span>{agent.price}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs h-9 border-border/60" 
                    onClick={() => handleViewManifest(agent)}
                  >
                    View Manifest
                  </Button>
                  <Button className="flex-1 text-xs h-9 bg-foreground text-background hover:bg-foreground/90 font-medium" asChild>
                    <Link href={`/agent/${agent.id}/chat`}>
                      Call Agent
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No agents found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or category filters.</p>
            <Button 
              variant="link" 
              className="mt-4 text-primary"
              onClick={() => setSearchQuery("")}
            >
              Clear all filters
            </Button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-20 p-8 rounded-3xl bg-foreground text-background overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Build your own reputable agent</h2>
            <p className="text-foreground/60 max-w-xl mb-6">
              BlockOps agents are registered on-chain, build verifiable reputation, and can be discovered by anyone.
              Start building your first autonomous agent today.
            </p>
            <Button size="lg" variant="secondary" className="font-bold h-12" asChild>
              <Link href="/agent-builder">
                Start Building
                <Zap className="ml-2 h-4 w-4 fill-current" />
              </Link>
            </Button>
          </div>
          <Bot className="absolute -right-10 -bottom-10 h-64 w-64 text-background/5 rotate-12" />
        </div>
      </main>

      {/* Manifest Dialog */}
      <Dialog open={manifestDialogOpen} onOpenChange={setManifestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden border-border/60">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">agent.json</DialogTitle>
                  <DialogDescription className="text-xs">
                    Official ERC-8004 Manifest for {selectedAgentForManifest?.name}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed overflow-x-auto">
              <pre className="text-foreground/80">
                {JSON.stringify(selectedAgentForManifest, null, 2)}
              </pre>
            </div>
            
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Verification Status
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Identity</span>
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Registered on Arbitrum Sepolia
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Reputation</span>
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verifiable Trust Score
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
            <Button variant="ghost" className="h-9 text-xs" onClick={() => setManifestDialogOpen(false)}>
              Close
            </Button>
            <Button className="h-9 text-xs gap-2" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(selectedAgentForManifest, null, 2));
              // toast({ title: "Copied", description: "Manifest JSON copied to clipboard" });
            }}>
              <Copy className="h-3.5 w-3.5" />
              Copy JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
