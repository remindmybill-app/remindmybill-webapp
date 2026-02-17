import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import type { UserTier } from '@/lib/types';

// Initialize Supabase Admin Client (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ─── Helper: Log subscription events ────────────────────────────────────────
async function logSubscriptionEvent(
    userId: string,
    eventType: string,
    fromTier: string | null,
    toTier: string | null,
    stripeEventId: string,
    metadata?: Record<string, unknown>
) {
    try {
        await supabaseAdmin.from('subscription_events').insert({
            user_id: userId,
            event_type: eventType,
            from_tier: fromTier,
            to_tier: toTier,
            stripe_event_id: stripeEventId,
            metadata,
        });
    } catch (err) {
        console.error('[Webhook] Failed to log subscription event:', err);
    }
}

// ─── Helper: Find user by Stripe customer ID or email ────────────────────
async function findUserByCustomer(customerId: string) {
    // First try by stripe_customer_id
    const { data: byStripe } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();

    if (byStripe) return byStripe;

    // Fallback: look up via Stripe customer email
    try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!('deleted' in customer) && customer.email) {
            const { data: byEmail } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('email', customer.email)
                .single();
            return byEmail;
        }
    } catch (err) {
        console.error('[Webhook] Error retrieving Stripe customer:', err);
    }

    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const headersList = await headers();
        const signature = headersList.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error(`[Webhook] Signature verification failed: ${err.message}`);
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }

        console.log(`[Webhook] Received event: ${event.type}`);

        switch (event.type) {
            // ─── Checkout Completed ─────────────────────────────────────
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const userId = session.client_reference_id;
                const metadata = session.metadata || {};
                const tier = metadata.tier as UserTier | undefined;
                const customerId = session.customer as string;

                if (!userId) {
                    console.warn('[Webhook] No client_reference_id in checkout session');
                    break;
                }

                const isLifetime = session.mode === 'payment' || tier === 'lifetime';

                const updates: Record<string, any> = {
                    stripe_customer_id: customerId,
                    tier_updated_at: new Date().toISOString(),
                };

                if (isLifetime) {
                    // Lifetime one-time payment
                    updates.user_tier = 'lifetime';
                    updates.is_pro = true;
                    updates.subscription_tier = 'premium';
                    updates.subscription_limit = 99999;
                    updates.lifetime_purchase_date = new Date().toISOString();
                    updates.email_alerts_limit = 99999;
                    // One-time payment → no subscription ID
                    updates.stripe_subscription_id = null;

                    console.log(`[Webhook] Upgrading user ${userId} to LIFETIME`);
                } else {
                    // Pro subscription
                    updates.user_tier = 'pro';
                    updates.is_pro = true;
                    updates.subscription_tier = 'pro';
                    updates.subscription_limit = 99999;
                    updates.email_alerts_limit = 99999;
                    updates.subscription_interval = metadata.interval === 'yearly' ? 'annual' : 'monthly';
                    updates.stripe_subscription_id = session.subscription as string;

                    console.log(`[Webhook] Upgrading user ${userId} to PRO (${metadata.interval})`);
                }

                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update(updates)
                    .eq('id', userId);

                if (error) {
                    console.error('[Webhook] Database update failed:', error);
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
                }

                await logSubscriptionEvent(
                    userId,
                    'upgrade',
                    'free',
                    isLifetime ? 'lifetime' : 'pro',
                    event.id,
                    { interval: metadata.interval }
                );

                // Send welcome email (non-blocking)
                try {
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('full_name, email')
                        .eq('id', userId)
                        .single();

                    const email = session.customer_email || session.customer_details?.email || profile?.email;
                    if (email) {
                        const { sendPlanChangeEmail } = await import('@/lib/email');
                        await sendPlanChangeEmail({
                            email,
                            userName: profile?.full_name || 'Valued Customer',
                            planName: isLifetime ? 'Fortress (Lifetime)' : 'Shield (Pro)',
                            price: isLifetime ? '$99 one-time' : (metadata.interval === 'yearly' ? '$39/year' : '$4.99/mo'),
                            limit: 99999,
                            type: 'upgrade',
                            date: new Date().toLocaleDateString(),
                        });
                    }
                } catch (emailErr) {
                    console.error('[Webhook] Failed to send upgrade email:', emailErr);
                }
                break;
            }

            // ─── Subscription Updated (plan change) ───
            case 'customer.subscription.updated': {
                const subscription = event.data.object as any;
                const customerId = subscription.customer as string;
                const user = await findUserByCustomer(customerId);

                if (!user) {
                    console.warn(`[Webhook] No user found for customer ${customerId}`);
                    break;
                }

                // Just log the update for now
                console.log(`[Webhook] Subscription updated for user ${user.id}`);
                break;
            }

            // ─── Subscription Deleted (cancellation → downgrade to free) ─
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;
                const customerId = subscription.customer as string;
                const user = await findUserByCustomer(customerId);

                if (!user) {
                    console.warn(`[Webhook] No user found for customer ${customerId}`);
                    break;
                }

                // Don't downgrade Lifetime users (their payment is one-time, no subscription)
                if (user.user_tier === 'lifetime') {
                    console.log(`[Webhook] Skipping downgrade for lifetime user ${user.id}`);
                    break;
                }

                const previousTier = user.user_tier;
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        user_tier: 'free',
                        is_pro: false,
                        subscription_tier: 'free',
                        subscription_limit: 7,
                        subscription_interval: null,
                        sms_addon_enabled: false,
                        stripe_subscription_id: null,
                        email_alerts_limit: 3,
                        tier_updated_at: new Date().toISOString(),
                    })
                    .eq('id', user.id);

                if (error) {
                    console.error('[Webhook] Error downgrading user:', error);
                } else {
                    console.log(`[Webhook] Downgraded user ${user.id} to FREE`);

                    await logSubscriptionEvent(
                        user.id,
                        'cancellation',
                        previousTier,
                        'free',
                        event.id
                    );

                    // Send downgrade email
                    try {
                        const { sendPlanChangeEmail } = await import('@/lib/email');
                        await sendPlanChangeEmail({
                            email: user.email,
                            userName: user.full_name || 'Valued Customer',
                            planName: 'Guardian (Free)',
                            price: '$0.00',
                            limit: 7,
                            type: 'downgrade',
                            date: new Date().toLocaleDateString(),
                        });
                    } catch (emailErr) {
                        console.error('[Webhook] Failed to send downgrade email:', emailErr);
                    }
                }
                break;
            }

            // ─── Invoice Payment Failed ──────────────────────────────────
            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                const customerId = invoice.customer as string;
                const user = await findUserByCustomer(customerId);

                if (user) {
                    console.warn(`[Webhook] Payment failed for user ${user.id}`);
                    await logSubscriptionEvent(
                        user.id,
                        'payment_failed',
                        user.user_tier,
                        user.user_tier,
                        event.id,
                        { invoiceId: invoice.id, amount: invoice.amount_due }
                    );
                }
                break;
            }

            // ─── Invoice Payment Succeeded (renewal tracking) ────────────
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as any;
                const customerId = invoice.customer as string;
                const user = await findUserByCustomer(customerId);

                if (user && invoice.billing_reason === 'subscription_cycle') {
                    await logSubscriptionEvent(
                        user.id,
                        'renewal',
                        user.user_tier,
                        user.user_tier,
                        event.id,
                        { invoiceId: invoice.id, amount: invoice.amount_paid }
                    );
                    console.log(`[Webhook] Renewal recorded for user ${user.id}`);
                }
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Webhook] Handler failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
