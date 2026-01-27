
import { generateSafeContent } from "@/lib/gemini"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { domain } = await req.json()

        if (!domain) {
            return NextResponse.json({ error: "Domain is required" }, { status: 400 })
        }

        // Initialize Gemini via central lib

        const prompt = `
      Analyze the trustworthiness of the subscription service at this domain: ${domain}.
      Return a VALID JSON object with the following fields:
      - service_name: string
      - trust_score: number (0-100)
      - category: string (e.g., Streaming, Fitness, Software)
      - cancellation_difficulty: "easy" | "medium" | "hard"
      - dark_patterns: string array (list any common deceptive patterns this company uses)
      - positive_features: string array
      - risk_flags: string array
      - trend: "stable" | "rising" | "falling"
      - alert_count: number

      If the service is unknown or the domain is invalid, return null.
      Do not include any explanation or markdown formatting, just the raw JSON.
    `

        // REMOVED MOCK FALLBACK - Using central lib which handles API key presence

        try {
            const text = await generateSafeContent(prompt)

            if (!text) {
                throw new Error("AI analysis unavailable")
            }

            // Clean markdown from response if present
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim()
            const data = JSON.parse(jsonStr)

            return NextResponse.json(data)
        } catch (apiError) {
            console.error("FULL AI ERROR (Trust API):", apiError)
            // Fallback mock if API fails
            return NextResponse.json({
                service_name: domain,
                trust_score: 50,
                category: "Unknown",
                cancellation_difficulty: "medium",
                dark_patterns: ["Could not analyze (API Error)"],
                positive_features: [],
                risk_flags: ["Analysis Failed"],
                trend: "stable",
                alert_count: 0
            })
        }

    } catch (error) {
        console.error("Trust API Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
