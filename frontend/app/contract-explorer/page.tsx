"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContractInteraction } from "@/components/contract-interaction"
import { UserProfile } from "@/components/user-profile"
import { useAuth } from "@/lib/auth"

export default function ContractExplorerPage() {
  const router = useRouter()
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4 max-w-[1400px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/my-agents")}
                className="shrink-0 hover:bg-accent transition-colors"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate">
                  <span className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Contract Explorer
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Interact with smart contracts on the blockchain
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <UserProfile onLogout={logout} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-[1400px]">
        <ContractInteraction />
      </div>
    </div>
  )
}
