import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import crypto from "crypto";
// import CancellationWarning from "@/lib/emails/CancellationWarning"; // Will be implemented in Phase 5
// import { render } from "@react-email/render";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any, // Using latest or casting to avoid mismatch
});
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { survey, tier, email } = await req.json();
        const supabase = await getSupabaseServerClient();

        // Get authenticated user
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Prevent double cancellation in same period
        if (profile.cancellation_scheduled) {
            return NextResponse.json(
                { error: "Cancellation already scheduled" },
                { status: 400 }
            );
        }

        // Calculate cancellation date (end of current billing period)
        let cancellationDate: Date;

        if (profile.stripe_subscription_id) {
            // Get Stripe subscription to find period_end
            const subscription = await stripe.subscriptions.retrieve(
                profile.stripe_subscription_id
            ) as any;

            cancellationDate = new Date(subscription.current_period_end * 1000);

            // Cancel at period end (user keeps access)
            await stripe.subscriptions.update(profile.stripe_subscription_id, {
                cancel_at_period_end: true,
                cancellation_details: {
                    comment: `Reason: ${survey.reason}`,
                    feedback: survey.reason,
                },
            });
        } else {
            // Lifetime user - immediate downgrade (or just set date to now)
            // For lifetime, maybe we shouldn't really 'cancel' in the same way, but let's assume immediate.
            cancellationDate = new Date();
        }

        // Generate reactivation token
        const reactivationToken = crypto.randomBytes(32).toString("hex");

        // Save cancellation survey
        await supabase.from("cancellation_surveys").insert({
            user_id: user.id,
            reason: survey.reason,
            reason_other: survey.reason_other || null,
            general_feedback: survey.general_feedback || null,
            tier_at_cancellation: tier,
            days_as_subscriber: Math.floor(
                (Date.now() - new Date(profile.created_at).getTime()) /
                (1000 * 60 * 60 * 24)
            ),
            subscription_value_paid:
                tier === "lifetime"
                    ? 99
                    : profile.subscription_interval === "annual"
                        ? 39
                        : 4.99,
        });

        // Update profile with cancellation details
        await supabase
            .from("profiles")
            .update({
                cancellation_scheduled: true,
                cancellation_date: cancellationDate.toISOString(),
                cancellation_reason: survey.reason,
                cancellation_feedback: survey,
                previous_tier: tier,
                cancel_reactivation_token: reactivationToken,
            })
            .eq("id", user.id);

        // Determine if we should send immediate email or scheduled email
        const hoursUntilCancellation =
            (cancellationDate.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilCancellation > 24) {
            // Send "will be downgraded" email
            // In Phase 5 we will use the React Email template
            /*
            const emailHtml = await render(CancellationWarning({
              name: profile.full_name || 'there',
              tier,
              cancellationDate,
              reactivationToken
            }));
            */

            const emailHtml = `
        <h1>Subscription Cancellation Scheduled</h1>
        <p>Your access will end on ${cancellationDate.toDateString()}.</p>
        <p>To reactivate, use this token: ${reactivationToken}</p>
        <p>(Better email coming soon)</p>
      `;

            await resend.emails.send({
                from: "RemindMyBill <no-reply@remindmybill.com>",
                to: email,
                subject: "Your subscription will end soon",
                html: emailHtml,
            });
        }
        // If <24 hours, skip warning email (will send confirmation on downgrade)

        return NextResponse.json({
            success: true,
            cancellationDate: cancellationDate.toISOString(),
            sendWarningEmail: hoursUntilCancellation > 24,
        });
    } catch (error) {
        console.error("Cancellation error:", error);
        return NextResponse.json(
            { error: "Failed to process cancellation" },
            { status: 500 }
        );
    }
}
