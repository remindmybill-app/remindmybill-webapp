import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getRemainingEmailQuota } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const remaining = await getRemainingEmailQuota(user.id);
        const limit = 3; // Fixed for free users
        const used = Math.max(0, limit - remaining);

        return NextResponse.json({
            used,
            limit,
            remaining,
        });
    } catch (error) {
        console.error("[API] Email quota error:", error);
        return NextResponse.json(
            { error: "Failed to fetch email quota" },
            { status: 500 }
        );
    }
}
