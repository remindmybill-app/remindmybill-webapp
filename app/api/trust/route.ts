import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { domain } = await req.json()

        if (!domain) {
            return NextResponse.json({ error: "Domain is required" }, { status: 400 })
        }

        // AI Path DISABLED - Returning Fallback Mock
        return NextResponse.json({
            service_name: domain,
            trust_score: 50,
            category: "Unknown",
            cancellation_difficulty: "medium",
            dark_patterns: ["AI Analysis is temporarily disabled"],
            positive_features: [],
            risk_flags: ["Analysis Paused"],
            trend: "stable",
            alert_count: 0
        })

    } catch (error) {
        console.error("Trust API Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
