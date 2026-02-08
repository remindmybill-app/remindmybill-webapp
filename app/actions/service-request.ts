"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

// Rate limit: 1 request per hour per IP
const RATE_LIMIT_DURATION = 60 * 60 * 1000 // 1 hour in ms

export async function submitServiceRequest(serviceName: string) {
    try {
        const supabase = getSupabaseServerClient()
        const headerList = await headers()

        // Get IP address for rate limiting
        // Fallback to 'unknown' if not found, though in production Vercel/Supabase usually provide this
        const ip = (headerList.get("x-forwarded-for") || "unknown").split(",")[0].trim()

        if (!serviceName || serviceName.trim().length < 2) {
            return { success: false, error: "Service name is too short." }
        }

        // 1. Check Rate Limit
        // We check the last request from this IP in the review_requests table
        const { data: recentRequests, error: fetchError } = await supabase
            .from("review_requests")
            .select("created_at")
            .eq("user_ip", ip)
            .order("created_at", { ascending: false })
            .limit(1)

        if (fetchError) {
            // If table doesn't exist or error, we might log it.
            // Failing open for now to avoid blocking legitimate users.
            console.warn("[ServiceRequest] Rate limit check failed (failing open):", fetchError.message)
        } else {
            if (recentRequests && recentRequests.length > 0) {
                const lastRequestTime = new Date(recentRequests[0].created_at).getTime()
                const now = Date.now()
                if (now - lastRequestTime < RATE_LIMIT_DURATION) {
                    return {
                        success: false,
                        error: "You have submitted a request recently. Please try again in an hour."
                    }
                }
            }
        }

        // 2. Insert Request
        const { error: insertError } = await supabase
            .from("review_requests")
            .insert({
                service_name: serviceName.trim(),
                user_ip: ip,
                status: 'pending'
            })

        if (insertError) {
            console.error("[ServiceRequest] Insert failed:", insertError)
            return { success: false, error: "Failed to submit request. Please try again later." }
        }

        return { success: true }
    } catch (error) {
        console.error("[ServiceRequest] Unexpected error:", error)
        return { success: false, error: "An unexpected error occurred." }
    }
}
