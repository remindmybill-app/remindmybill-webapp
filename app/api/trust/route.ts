
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { domain } = await req.json()

        if (!domain) {
            return NextResponse.json({ error: "Domain is required" }, { status: 400 })
        }

        // Initialize Gemini (assuming API key is in env)
        // If not, we'll gracefully fall back or error, but this structure allows easy config
        const apiKey = process.env.GOOGLE_API_KEY || "dummy_key_if_missing"
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-pro" })

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

        // In a real scenario, we'd wrap this call. For demo purposes, if API key is missing/invalid,
        // we might want to return a mock response to ensure the UI works for the user.
        // However, I will implement the actual call.

        // MOCK FALLBACK for stability during development if no key:
        if (apiKey === "dummy_key_if_missing") {
            console.warn("Missing GOOGLE_API_KEY, returning mock data")
            return NextResponse.json({
                service_name: domain,
                trust_score: 75,
                category: "Unknown",
                cancellation_difficulty: "medium",
                dark_patterns: ["Simulated Dark Pattern"],
                positive_features: ["Simulated Positive Feature"],
                risk_flags: ["Simulated Risk Flag"],
                trend: "stable",
                alert_count: 1
            })
        }

        try {
            const result = await model.generateContent(prompt)
            const response = await result.response
            const text = response.text()

            // Clean markdown from response if present
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim()
            const data = JSON.parse(jsonStr)

            return NextResponse.json(data)
        } catch (apiError) {
            console.error("Gemini API Error:", apiError)
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
