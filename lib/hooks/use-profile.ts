"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setProfile(null)
        setIsLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (fetchError) {
        throw fetchError
      }

      setProfile(data)
    } catch (err) {
      console.error("[v0] Error fetching profile:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch profile")
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
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

      if (profile) {
        setProfile({ ...profile, ...updates })
      }
    } catch (err) {
      console.error("[v0] Error updating profile:", err)
      setError(err instanceof Error ? err.message : "Failed to update profile")
    }
  }

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile: fetchProfile,
  }
}
