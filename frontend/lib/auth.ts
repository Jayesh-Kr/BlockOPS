'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import { supabase, type User } from './supabase'

export function useAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { connectWallet } = useWallets()
  const [dbUser, setDbUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ready && authenticated && user) {
      syncUser()
    } else {
      setDbUser(null)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user])

  const syncUser = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        // PGRST116 = "not found" (this is OK, we'll create the user)
        if (fetchError.code === 'PGRST116') {
          // User doesn't exist, continue to create
        } else {
          // Other error - log full details
          console.error('Error fetching user:', {
            message: fetchError.message,
            code: fetchError.code,
            details: fetchError.details,
            hint: fetchError.hint,
            fullError: fetchError
          })
          setLoading(false)
          return
        }
      }

      if (existingUser) {
        // User exists, update if needed
        setDbUser(existingUser)
      } else {
        // User doesn't exist, create new user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            private_key: null,
            wallet_address: null,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', {
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint,
            fullError: createError
          })
        } else {
          setDbUser(newUser)
        }
      }
    } catch (error) {
      console.error('Error syncing user:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectMetaMask = async () => {
    // Check if MetaMask is available
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // Try to connect directly to MetaMask first
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
        // Then use Privy's connectWallet for MetaMask
        await connectWallet('metamask')
      } catch (error) {
        // Fallback to Privy's login modal
        login()
      }
    } else {
      // No MetaMask detected, use Privy login
      login()
    }
  }

  return {
    ready,
    authenticated,
    user,
    dbUser,
    loading,
    login: connectMetaMask,
    logout,
    syncUser,
  }
}

