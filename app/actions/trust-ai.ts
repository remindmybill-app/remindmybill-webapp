'use server'

import { geminiFlash as model, generateSafeContent } from "@/lib/gemini"
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

    // 2. If NOT found, call Gemini Flash
    console.log(`[TrustAI] No DB record found. Calling Gemini for: ${query}`)

    try {
        const prompt = `
            Analyze the company '${query}' regarding consumer trust and safety.
            Provide an ethical audit focused on subscription transparency and ease of cancellation.
            
            Return ONLY a JSON object with this exact structure:
            {
                "service_name": "string",
                "trust_score": number (0-100),
                "category": "string",
                "cancellation_difficulty": "easy" | "medium" | "hard",
                "dark_patterns": ["string"],
                "positive_features": ["string"],
                "risk_flags": ["string"],
                "privacy_summary": "2 sentences max about data handling"
            }
        `

        let text = await generateSafeContent(prompt)

        if (!text) {
            return {
                success: false,
                isQuotaExceeded: true,
                error: "AI analysis is temporarily unavailable due to high demand. Please try again tomorrow."
            }
        }

        // Clean markdown if present
        if (text.includes("```")) {
            text = text.replace(/```json|```/g, "").trim()
        }

        const aiData = JSON.parse(text)

        // 3. Save to DB for next time (Fire and forget or wait?)
        // Let's save it to keep our DB growing
        const { error: insertError } = await supabase
            .from('trust_analysis')
            .insert({
                service_name: aiData.service_name || query,
                trust_score: aiData.trust_score,
                category: aiData.category,
                cancellation_difficulty: aiData.cancellation_difficulty,
                dark_patterns: aiData.dark_patterns,
                positive_features: aiData.positive_features,
                risk_flags: aiData.risk_flags,
                trend: 'stable',
                alert_count: 0
            })

        if (insertError) {
            console.error("[TrustAI] Failed to cache AI result:", insertError)
        }

        return {
            success: true,
            source: 'ai',
            data: {
                ...aiData,
                // Add trend and alert_count for UI consistency with DB schema
                trend: 'stable',
                alert_count: 0
            }
        }
    } catch (err: any) {
        console.error('FULL AI ERROR (Trust):', err)
        return {
            success: false,
            error: "Failed to analyze service safety. Please try again later."
        }
    }
}
