"use client"

import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

/**
 * Fetches user profile with current subscription usage count
 * This is the SINGLE SOURCE OF TRUTH for user profile data
 */
async function getUserProfileWithUsage(): Promise<Profile | null> {
  const supabase = getSupabaseBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  // Fetch current subscription count
  const { count, error: countError } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  if (countError) {
    console.error("[useProfile] Error fetching subscription count:", countError)
  }

  // Return profile with current usage
  return {
    ...profile,
    current_usage: count || 0,
  } as Profile
}

export function useProfile() {
  const {
    data: profile,
    error,
    isLoading,
    mutate,
  } = useSWR<Profile | null>("user-profile", getUserProfileWithUsage, {
    // Revalidate on window focus to keep data fresh
    revalidateOnFocus: true,
    // Revalidate on reconnect
    revalidateOnReconnect: true,
    // Deduplicate requests within 2 seconds
    dedupingInterval: 2000,
  })

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const supabase = getSupabaseBrowserClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (updateError) {
        throw updateError
      }

      // Optimistically update the local cache
      if (profile) {
        await mutate({ ...profile, ...updates }, false)
      }

      // Revalidate to get fresh data from server
      await mutate()
    } catch (err) {
      console.error("[useProfile] Error updating profile:", err)
      throw err
    }
  }

  return {
    profile: profile || null,
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to fetch profile") : null,
    updateProfile,
    refreshProfile: mutate, // Alias for backward compatibility
    mutate, // Expose mutate for manual revalidation
  }
}
