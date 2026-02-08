"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Subscription } from "@/lib/types"

interface SubscriptionsContextType {
    subscriptions: Subscription[]
    isLoading: boolean
    error: string | null
    refreshSubscriptions: () => Promise<void>
    deleteSubscription: (id: string) => Promise<boolean>
    updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<boolean>
    cancelSubscription: (id: string) => Promise<boolean>
}

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined)

export function SubscriptionsProvider({ children }: { children: React.ReactNode }) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = getSupabaseBrowserClient()

    const fetchSubscriptions = useCallback(async () => {
        try {
            // Don't set loading to true on refresh to avoid flickering if we want smooth updates
            // But for initial load we want it. We can handle inside.
            // Actually, standard pattern is to keep old data while fetching new?
            // For now, let's keep it simple. If we are already loaded, maybe don't set isLoading=true strictly?
            // existing hook set it to true. Let's stick to that for now or maybe opt-out if we want background refresh.
            // Let's set it to true to show spinners as requested by "Auto-Refresh" expectation might be "show me it's updating"
            // or "just update the numbers". The user complained stats DO NOT update. 
            // If I set loading, the UI might flash skeletons.
            // Better: keep data, set separate isRefreshing flag? OR just await the fetch and replace.
            // PRO TIP: To make it feel "Instant", we should optimistically update or just fetch without full loading state if possible.
            // But let's stick to reliable fetching first.

            const { data: { user } } = await supabase.auth.getUser()

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
            setError(null)
        } catch (err) {
            console.error("[SubscriptionsProvider] Error:", err)
            const isNetworkError = err instanceof TypeError ||
                (err instanceof Error && (err.message.includes('fetch') || err.message.includes('network')))

            if (isNetworkError) {
                setError("Network error. Checking connection...")
            } else {
                setError("Failed to load subscriptions")
            }
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    // Initial fetch
    useEffect(() => {
        fetchSubscriptions()
    }, [fetchSubscriptions])

    const refreshSubscriptions = async () => {
        await fetchSubscriptions()
    }

    const deleteSubscription = async (id: string) => {
        try {
            const { error } = await supabase.from("subscriptions").delete().eq("id", id)
            if (error) throw error

            // Optimistic update
            setSubscriptions((prev) => prev.filter((sub) => sub.id !== id))
            return true
        } catch (err) {
            console.error("Error deleting subscription:", err)
            setError("Failed to delete subscription")
            // Revert or re-fetch? Re-fetch to be safe
            fetchSubscriptions()
            return false
        }
    }

    const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
        try {
            const { error } = await supabase.from("subscriptions").update(updates).eq("id", id)
            if (error) throw error

            // Optimistic update
            setSubscriptions((prev) => prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)))
            return true
        } catch (err) {
            console.error("Error updating subscription:", err)
            setError("Failed to update subscription")
            fetchSubscriptions()
            return false
        }
    }

    const cancelSubscription = async (id: string) => {
        try {
            const { error } = await supabase.from("subscriptions").update({ status: 'cancelled' }).eq("id", id)
            if (error) throw error

            // Optimistic update (remove from active list since we filter by status=active usually? 
            // Wait, the fetch query filters eq("status", "active"). 
            // If we cancel, it should be removed from the list.
            // So filtering it out is correct for "Active Subscriptions" view.
            setSubscriptions((prev) => prev.filter((sub) => sub.id !== id))
            // If we want to show cancelled ones, we need to change fetch logic. 
            // But usage says "Active Subscriptions".
            return true
        } catch (err) {
            console.error("Error cancelling subscription:", err)
            setError("Failed to cancel subscription")
            fetchSubscriptions()
            return false
        }
    }

    return (
        <SubscriptionsContext.Provider
            value={{
                subscriptions,
                isLoading,
                error,
                refreshSubscriptions,
                deleteSubscription,
                updateSubscription,
                cancelSubscription
            }}
        >
            {children}
        </SubscriptionsContext.Provider>
    )
}

export function useSubscriptionsContext() {
    const context = useContext(SubscriptionsContext)
    if (context === undefined) {
        throw new Error("useSubscriptionsContext must be used within a SubscriptionsProvider")
    }
    return context
}
