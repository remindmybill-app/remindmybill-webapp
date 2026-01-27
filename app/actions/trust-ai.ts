'use server'

import { createClient } from "@/lib/supabase-server"

export async function analyzeCompanySafety(query: string) {
    if (!query) throw new Error("Query is required")

    const supabase = await createClient()

    // 1. Check local Supabase trust_analysis table
    const { data: existingData, error: dbError } = await supabase
        .from('trust_analysis')
        .select('*')
        .ilike('service_name', `%${query}%`)
        .single()

    if (existingData) {
        console.log(`[TrustAI] Found existing data for: ${query}`)
        return {
            success: true,
            source: 'database',
            data: existingData
        }
    }

    // 2. AI Path DISABLED
    return {
        success: false,
        error: "AI analysis is temporarily disabled."
    }
}
