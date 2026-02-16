import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId, subscription, deviceName } = await req.json();

        const supabase = await getSupabaseServerClient();

        // Check if subscription already exists
        const { data: existing } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("endpoint", subscription.endpoint)
            .single();

        if (existing) {
            // Update last_used timestamp
            await supabase
                .from("push_subscriptions")
                .update({ last_used: new Date().toISOString() })
                .eq("id", existing.id);
        } else {
            // Insert new subscription
            await supabase.from("push_subscriptions").insert({
                user_id: userId,
                subscription,
                endpoint: subscription.endpoint,
                device_name: deviceName,
                is_active: true,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Push subscription error:", error);
        return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }
}
