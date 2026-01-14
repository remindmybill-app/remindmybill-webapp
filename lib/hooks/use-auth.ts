"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  let supabase: ReturnType<typeof getSupabaseBrowserClient> | undefined
  try {
    supabase = getSupabaseBrowserClient()
  } catch (err) {
    console.error("[useAuth] Failed to initialize Supabase client:", err)
    setError(err instanceof Error ? err.message : "Failed to connect to authentication service")
    setIsLoading(false)
  }

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    // Check active session
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        setError(null)
      } catch (err) {
        console.error("[useAuth] Session check failed:", err)
        setError("Unable to verify authentication status")
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async () => {
    if (!supabase) {
      console.error("[useAuth] Cannot sign in: Supabase client not initialized")
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/gmail.readonly",
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.error("[useAuth] Error signing in:", error.message)
        setError(error.message)
      }
    } catch (err) {
      console.error("[useAuth] Sign in failed:", err)
      setError("Failed to initiate sign in")
    }
  }

  const signOut = async () => {
    if (!supabase) {
      console.error("[useAuth] Cannot sign out: Supabase client not initialized")
      return
    }

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("[useAuth] Error signing out:", error.message)
        setError(error.message)
      }
    } catch (err) {
      console.error("[useAuth] Sign out failed:", err)
      setError("Failed to sign out")
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signOut,
  }
}
