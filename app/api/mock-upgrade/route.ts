
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        // 1. Parse request body
        const { userId, plan } = await req.json()

        if (!userId || !plan) {
            return NextResponse.json({ error: "Missing userId or plan" }, { status: 400 })
        }

        // 2. Simulate delay (2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // 3. Initialize Supabase Admin Client (Service Role)
        // We need admin privileges to update the profile directly without RLS issues if we were strictly checking things,
        // though usually a user can update their own profile. However, keeping 'subscription_tier' secure is better.
        // Ideally this route is protected or checked. For this mock, we'll use the service role to ensure it works.
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 4. Determine limits based on plan
        let limit = 10
        if (plan === "standard") limit = 50
        if (plan === "premium" || plan === "pro") limit = 200 // "Pro" in UI seems to map to premium/standard logic

        // 5. Update Profile
        const { error } = await supabaseAdmin
            .from("profiles")
            .update({
                subscription_tier: plan === 'pro' ? 'pro' : plan, // normalize to 'pro' if that's what we use
                subscription_limit: limit,
                subscription_status: "active",
                stripe_customer_id: "mock_cust_" + Math.random().toString(36).substring(7),
                stripe_subscription_id: "mock_sub_" + Math.random().toString(36).substring(7),
            })
            .eq("id", userId)

        if (error) {
            console.error("Supabase update error:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, plan, limit })
    } catch (error: any) {
        console.error("Mock upgrade error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
