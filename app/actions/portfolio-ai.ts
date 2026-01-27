'use server'

import { generateSafeContent } from "@/lib/gemini"

export async function generatePortfolioInsights(subscriptions: any[]) {
    if (!subscriptions || subscriptions.length === 0) {
        return {
            success: true,
            data: {
                leakage: "No subscriptions found to analyze.",
                forecast: "Add subscriptions to see your future spending forecast.",
                risks: "No risks detected in an empty portfolio."
            }
        }
    }

    // Prepare data for AI
    const subList = subscriptions.map(s => ({
        name: s.name,
        price: `${s.cost} ${s.currency}`,
        frequency: s.frequency,
        category: s.category
    }))

    try {
        const prompt = `
            Analyze this subscription portfolio for a consumer.
            PORTFOLIO: ${JSON.stringify(subList)}

            Return ONLY a JSON object with these 3 sections:
            1. **leakage**: Identify overlapping services (e.g., Spotify + Apple Music) or duplicate categories. Calculate potential yearly savings if one is cancelled.
            2. **forecast**: Summarize the 'Burn Rate' for the next 30 days based on the price and frequency. Identify if there's a 'Heavy Spend Week' coming up.
            3. **risks**: Flag any merchants known for 'Dark Patterns', difficult cancellation, or recent price hikes (based on your general knowledge). Mention specific names from the portfolio.

            Output Format:
            {
                "leakage": "string (markdown allowed)",
                "forecast": "string (markdown allowed)",
                "risks": "string (markdown allowed)"
            }
        `

        let text = await generateSafeContent(prompt)

        if (!text) {
            return {
                success: false,
                isQuotaExceeded: true,
                error: "AI insights are temporarily unavailable."
            }
        }

        // Clean markdown if present
        if (text.includes("```")) {
            text = text.replace(/```json|```/g, "").trim()
        }

        const insights = JSON.parse(text)

        return {
            success: true,
            data: insights
        }
    } catch (err: any) {
        console.error('FULL AI ERROR (Portfolio):', err)
        return {
            success: false,
            error: "Failed to generate AI insights."
        }
    }
}
