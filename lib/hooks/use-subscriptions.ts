"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Subscription } from "@/lib/types"

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSubscriptions([])
        setIsLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          setSubscriptions([])
          return
        }
        throw fetchError
      }

      setSubscriptions(data || [])
    } catch (err) {
      console.error("[use-subscriptions] Error fetching subscriptions:", err)

      // Check if it's a network error (Supabase unreachable)
      const isNetworkError = err instanceof TypeError ||
        (err instanceof Error && (err.message.includes('fetch') || err.message.includes('network')))

      if (isNetworkError) {
        setError("Database temporarily unavailable. Please check your connection or try again later.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch subscriptions")
      }

      setSubscriptions([])
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSubscriptions = () => {
    fetchSubscriptions()
  }

  return {
    subscriptions,
    isLoading,
    error,
    refreshSubscriptions,
  }
}
