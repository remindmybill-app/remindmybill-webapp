import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
});
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
    // Verify Cron Secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Find profiles with cancellation_scheduled = true and cancellation_date < now
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("cancellation_scheduled", true)
        .lt("cancellation_date", new Date().toISOString());

    if (error) {
        console.error("Cron fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = {
        processed: 0,
        failed: 0,
        errors: [] as string[],
    };

    for (const profile of profiles) {
        try {
            // 1. Process Stripe Downgrade (if not already handled by cancel_at_period_end)
            // Actually, cancel_at_period_end handles the stripe side. We just need to sync local state.
            // But if we want to force it or ensure it's done:
            if (profile.stripe_subscription_id) {
                const sub = await stripe.subscriptions.retrieve(
                    profile.stripe_subscription_id
                ) as any;

                if (sub.status === 'active' && !sub.cancel_at_period_end) {
                    // Should have been set, but let's ensure
                    // actually, if date passed, it should be canceled or past_due.
                }
            }

            // 2. Downgrade local profile to free
            await supabase.from("profiles").update({
                subscription_tier: "free",
                user_tier: "free",
                cancellation_scheduled: false,
                cancellation_date: null,
                cancellation_reason: null,
                cancel_reactivation_token: null,
                stripe_subscription_id: null,
                stripe_price_id: null
            }).eq("id", profile.id);

            // 3. Send Downgrade Confirmation Email
            /*
            // Phase 5 template
            const emailHtml = await render(DowngradeConfirmation({
                name: profile.full_name || 'there',
                previousTier: profile.previous_tier || 'Pro'
            }));
            */

            const emailHtml = `
        <h1>Your plan has been switched to Free</h1>
        <p>Your ${profile.previous_tier} subscription has ended.</p>
        <p><a href="${process.env.NEXT_PUBLIC_URL}/pricing">Upgrade again</a></p>
      `;

            await resend.emails.send({
                from: "RemindMyBill <no-reply@remindmybill.com>",
                to: profile.email,
                subject: "Your account has been switched to the Free plan",
                html: emailHtml,
            });

            results.processed++;
        } catch (err: any) {
            console.error(`Failed to process profile ${profile.id}:`, err);
            results.failed++;
            results.errors.push(err.message);
        }
    }

    return NextResponse.json(results);
}
