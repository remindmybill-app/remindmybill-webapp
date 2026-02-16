import { getSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-01-27.acacia" as any,
    });
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { token } = await req.json();
        const supabase = await getSupabaseServerClient();

        // Find user by reactivation token
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('cancel_reactivation_token', token)
            .eq('cancellation_scheduled', true)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 404 }
            );
        }

        // Check if cancellation date has passed
        if (new Date(profile.cancellation_date) < new Date()) {
            return NextResponse.json(
                { error: 'Cancellation period has ended' },
                { status: 400 }
            );
        }

        // Reactivate Stripe subscription
        if (profile.stripe_subscription_id) {
            await stripe.subscriptions.update(profile.stripe_subscription_id, {
                cancel_at_period_end: false
            });
        }

        // Clear cancellation fields
        await supabase
            .from('profiles')
            .update({
                cancellation_scheduled: false,
                cancellation_date: null,
                cancellation_reason: null,
                cancellation_feedback: null,
                cancel_reactivation_token: null
            })
            .eq('id', profile.id);

        // Send confirmation email
        await resend.emails.send({
            from: 'RemindMyBill <no-reply@remindmybill.com>',
            to: profile.email,
            subject: 'Welcome back! Your subscription is active',
            html: `
        <h1>Welcome back!</h1>
        <p>Your subscription to ${profile.user_tier} has been reactivated.</p>
      `
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reactivation error:', error);
        return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
        );
    }
}
