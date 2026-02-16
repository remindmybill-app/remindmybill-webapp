import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId, endpoint } = await req.json();
        const supabase = await getSupabaseServerClient();

        await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("user_id", userId)
            .eq("endpoint", endpoint);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to unsubscribe" },
            { status: 500 }
        );
    }
}
