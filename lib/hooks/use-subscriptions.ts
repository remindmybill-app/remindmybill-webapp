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

  // NOTE: Email reminder logic should be implemented in a Supabase Edge Function
  // triggered by a cron job (pg_cron).
  // Example path: supabase/functions/send-reminders/index.ts
  // This hook handles client-side state only.

  const refreshSubscriptions = () => {
    fetchSubscriptions()
  }

  const deleteSubscription = async (id: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from("subscriptions").delete().eq("id", id)
      if (error) throw error
      setSubscriptions((prev) => prev.filter((sub) => sub.id !== id))
      return true
    } catch (err) {
      console.error("Error deleting subscription:", err)
      setError("Failed to delete subscription")
      return false
    }
  }

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from("subscriptions").update(updates).eq("id", id)
      if (error) throw error
      setSubscriptions((prev) => prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)))
      return true
    } catch (err) {
      console.error("Error updating subscription:", err)
      setError("Failed to update subscription")
      return false
    }
  }

  const cancelSubscription = async (id: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from("subscriptions").update({ status: 'cancelled' }).eq("id", id)
      if (error) throw error
      setSubscriptions((prev) => prev.map((sub) => (sub.id === id ? { ...sub, status: 'cancelled' } : sub)))
      return true
    } catch (err) {
      console.error("Error cancelling subscription:", err)
      setError("Failed to cancel subscription")
      return false
    }
  }

  return {
    subscriptions,
    isLoading,
    error,
    refreshSubscriptions,
    deleteSubscription,
    updateSubscription,
    cancelSubscription
  }
}
