import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import crypto from "crypto";
import { createClient } from "@/lib/supabase-server"; // Ensure consistent import if needed, but getSupabaseServerClient is fine too. Using getSupabaseServerClient as per original.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
    });
    const resend = new Resend(process.env.RESEND_API_KEY);

    let user: any = null;
    let profile: any = null;

    try {
        const body = await req.json().catch(() => ({}));
        const { survey, tier, email } = body;

        // 1. Validate inputs
        if (!survey || !tier || !email) {
            console.error("[Cancellation] Missing required fields:", { survey: !!survey, tier, email });
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = await getSupabaseServerClient();

        // 2. Auth Check
        const {
            data: { user: authUser },
            error: authError
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
            console.error('[Cancellation] Auth error:', authError);
            return NextResponse.json(
                { error: 'Unauthorized', details: authError?.message },
                { status: 401 }
            );
        }
        user = authUser;

        // 3. Get Profile
        const { data: userProfile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (profileError || !userProfile) {
            console.error('[Cancellation] Profile error:', profileError);
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }
        profile = userProfile;

        // 4. Check if already cancelled
        if (profile.cancellation_scheduled) {
            return NextResponse.json(
                { error: "Cancellation already scheduled" },
                { status: 400 }
            );
        }

        let cancellationDate: Date;

        // 5. Handle Stripe Cancellation (skip for Lifetime)
        if (profile.user_tier === 'lifetime') {
            cancellationDate = new Date();
            // Lifetime users don't have a subscription to cancel in Stripe usually, 
            // or it's a one-time payment. We just downgrade locally effectively.
        } else if (profile.stripe_subscription_id) {
            try {
                const subscription = await stripe.subscriptions.retrieve(
                    profile.stripe_subscription_id
                ) as any;

                cancellationDate = new Date(subscription.current_period_end * 1000);

                await stripe.subscriptions.update(profile.stripe_subscription_id, {
                    cancel_at_period_end: true,
                    cancellation_details: {
                        comment: `Reason: ${survey.reason}`,
                        feedback: survey.reason,
                    },
                });
            } catch (stripeError: any) {
                console.error('[Cancellation] Stripe error:', stripeError);
                return NextResponse.json(
                    { error: 'Stripe API error', details: stripeError.message },
                    { status: 500 }
                );
            }
        } else {
            // Edge case: User is 'pro' but no stripe ID?
            // Fallback to immediate cancellation or handle as error?
            // User requested robust handling.
            if (profile.user_tier !== 'free') {
                console.warn('[Cancellation] User is not free/lifetime but missing Stripe ID. Defaulting to immediate cancellation.');
                cancellationDate = new Date();
            } else {
                return NextResponse.json(
                    { error: 'Invalid subscription state: Not a paid user and no Stripe ID' },
                    { status: 400 }
                );
            }
        }

        // 6. Generate Token & Save Data
        const reactivationToken = crypto.randomBytes(32).toString("hex");

        const { error: dbError } = await supabase.from("cancellation_surveys").insert({
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

        if (dbError) {
            console.error('[Cancellation] Survey save error:', dbError);
            // Proceed anyway, not blocking
        }

        console.log('About to update database:', {
            userId: user.id,
            cancellationDate: cancellationDate.toISOString(),
            tier
        });

        // Wrap database update in try-catch
        try {
            const { error: updateError } = await supabase
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

            if (updateError) {
                console.error('Database update error:', updateError);
                throw updateError;
            }

            console.log('Database updated successfully');
        } catch (dbError: any) {
            console.error('Failed to update cancellation in database:', dbError);
            return NextResponse.json(
                {
                    error: 'Failed to save cancellation',
                    details: dbError.message
                },
                { status: 500 }
            );
        }

        // 7. Send Email (Non-blocking)
        try {
            const hoursUntilCancellation =
                (cancellationDate.getTime() - Date.now()) / (1000 * 60 * 60);

            if (hoursUntilCancellation > 24) {
                const { default: CancellationWarning } = await import("@/lib/emails/CancellationWarning");
                const { render } = await import("@react-email/render");

                const emailHtml = await render(CancellationWarning({
                    name: profile.full_name || 'there',
                    tier,
                    cancellationDate,
                    reactivationToken
                }));

                await resend.emails.send({
                    from: "RemindMyBill <no-reply@remindmybill.com>",
                    to: email,
                    subject: "Your subscription will end soon",
                    html: emailHtml,
                });
                console.log('Email sent successfully to:', email);
            } else {
                console.log('Skipping warning email (less than 24h until cancellation)');
            }
        } catch (emailError: any) {
            console.error('Email sending failed (non-blocking):', emailError);
            // Don't fail the request - cancellation is still saved
        }

        return NextResponse.json({
            success: true,
            cancellationDate: cancellationDate.toISOString(),
            sendWarningEmail: (cancellationDate.getTime() - Date.now()) / (1000 * 60 * 60) > 24,
        });

    } catch (error: any) {
        console.error('Cancellation error details:', {
            error: error.message,
            stack: error.stack,
            userId: user?.id,
            tier: profile?.user_tier,
            hasStripeSubscription: !!profile?.stripe_subscription_id
        });

        // Return specific error to frontend
        return NextResponse.json(
            {
                error: 'Failed to process cancellation',
                details: error.message,
                code: error.code || 'UNKNOWN'
            },
            { status: 500 }
        );
    }
}
