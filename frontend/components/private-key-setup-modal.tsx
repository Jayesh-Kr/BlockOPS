"use client"

import { useState } from "react"
import { Key, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { encryptPrivateKeyForStorage, normalizePrivateKey } from "@/lib/lit-private-key"

interface PrivateKeySetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onComplete: () => void
}

export function PrivateKeySetupModal({ 
  open, 
  onOpenChange, 
  userId,
  onComplete 
}: PrivateKeySetupModalProps) {
  const [privateKey, setPrivateKey] = useState("")
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validatePrivateKey = (key: string): boolean => {
    // Remove 0x prefix if present
    const cleanKey = key.startsWith('0x') ? key.slice(2) : key
    
    // Check if it's a valid 64-character hex string
    const hexRegex = /^[0-9a-fA-F]{64}$/
    return hexRegex.test(cleanKey)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!privateKey.trim()) {
      setError("Please enter your private key")
      return
    }

    if (!validatePrivateKey(privateKey.trim())) {
      setError("Invalid private key format. Please enter a valid 64-character hexadecimal private key (with or without 0x prefix)")
      return
    }

    setIsLoading(true)

    try {
      const formattedKey = normalizePrivateKey(privateKey.trim())

      // Derive wallet address from private key
      const { ethers } = await import('ethers')
      const wallet = new ethers.Wallet(formattedKey)
      const walletAddress = wallet.address

      // Encrypt private key with Lit before persisting
      const litEncryptedPayload = await encryptPrivateKeyForStorage(formattedKey)

      // Update user in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          private_key: litEncryptedPayload,
          wallet_address: walletAddress,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating user:', updateError)
        setError("Failed to save wallet credentials. Please try again.")
        return
      }

      toast({
        title: "Success!",
        description: "Your agent wallet has been set up with Lit-secured key storage.",
      })

      // Clear the input for security
      setPrivateKey("")
      setShowPrivateKey(false)
      
      // Call completion callback
      onComplete()
      
      // Close modal
      onOpenChange(false)
    } catch (error) {
      console.error('Error setting up private key:', error)
      setError("Failed to secure and store your private key with Lit. Please check your key and Lit configuration, then try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    setPrivateKey("")
    setShowPrivateKey(false)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Set Up Agent Wallet
          </DialogTitle>
          <DialogDescription>
            Add your private key to enable your agent to execute blockchain transactions on your behalf. Your key is encrypted with Lit Protocol before storage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <div className="relative">
              <Input
                id="privateKey"
                type={showPrivateKey ? "text" : "password"}
                placeholder="0x... or paste your 64-character hex key"
                value={privateKey}
                onChange={(e) => {
                  setPrivateKey(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                className="pr-10"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                disabled={isLoading}
              >
                {showPrivateKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your private key is encrypted via Lit Protocol and only decrypted when a signing operation needs it.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Security Note:</strong> Your private key is never stored in plaintext.
              It is encrypted by Lit Protocol and only ciphertext is persisted.
              Never share your private key with anyone. You can skip this step and add it later from your profile.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !privateKey.trim()}
              className="flex-1"
            >
              {isLoading ? "Setting Up..." : "Continue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
