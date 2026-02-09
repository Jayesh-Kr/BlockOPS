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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/my-agents")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Contract Explorer</h1>
                <p className="text-sm text-muted-foreground">
                  Interact with smart contracts on the blockchain
                </p>
              </div>
            </div>
            <UserProfile onLogout={logout} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <ContractInteraction />
      </div>
    </div>
  )
}
