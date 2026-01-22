
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { userId } = await req.json()

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({
                subscription_tier: 'free',
                subscription_limit: 10,
                subscription_status: "active", // or canceled if we want to simulate that
                stripe_subscription_id: null,
            })
            .eq("id", userId)

        if (error) {
            console.error("Supabase update error:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, tier: 'free' })
    } catch (error: any) {
        console.error("Mock downgrade error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
