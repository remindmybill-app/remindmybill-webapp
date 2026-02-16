import webpush from "web-push";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
    );

    try {
        const { userId, title, body, icon, data } = await req.json();

        const supabase = await getSupabaseServerClient();

        // Get user's active push subscriptions
        const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true);

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No active subscriptions",
            });
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: icon || "/icon-192x192.png",
            badge: "/icon-192x192.png",
            data: data || { url: "/dashboard" },
            vibrate: [200, 100, 200],
            actions: data?.actions || [],
        });

        // Send to all user's devices
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    // @ts-ignore
                    await webpush.sendNotification(sub.subscription, payload);

                    // Update last_used
                    await supabase
                        .from("push_subscriptions")
                        .update({ last_used: new Date().toISOString() })
                        .eq("id", sub.id);

                    return { success: true, id: sub.id };
                } catch (error: any) {
                    // Handle expired subscriptions
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await supabase
                            .from("push_subscriptions")
                            .update({ is_active: false })
                            .eq("id", sub.id);
                    }
                    throw error;
                }
            })
        );

        const successful = results.filter((r) => r.status === "fulfilled").length;

        return NextResponse.json({
            success: true,
            sent: successful,
            total: subscriptions.length,
        });
    } catch (error) {
        console.error("Push send error:", error);
        return NextResponse.json(
            { error: "Failed to send notification" },
            { status: 500 }
        );
    }
}
