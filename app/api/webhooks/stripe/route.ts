import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import type { UserTier } from '@/lib/types';
import Stripe from 'stripe';
import crypto from 'crypto';

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

// ─── Helper: Send Consolidated Downgrade Email ──────────────────────────
async function sendConsolidatedDowngrade({
    user,
    previousTier
}: {
    user: any,
    previousTier: string
}) {
    try {
        const { getRemainingEmailQuota, sendEmail } = await import('@/lib/email');
        const { default: ConsolidatedDowngrade } = await import('@/lib/emails/ConsolidatedDowngrade');
        const React = await import('react');

        // Get updated stats
        const { data: subs } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id);

        const remainingAlerts = await getRemainingEmailQuota(user.id);

        await sendEmail({
            to: user.email,
            subject: 'Your RemindMyBill plan has been updated',
            react: React.createElement(ConsolidatedDowngrade, {
                name: user.full_name || 'Valued Customer',
                previousTier,
                subscriptionCount: subs?.length || 0,
                remainingAlerts
            }),
            userId: user.id,
            emailType: 'downgrade'
        });
    } catch (err) {
        console.error('[Webhook] Failed to send consolidated downgrade email:', err);
    }
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
                    updates.user_tier = 'lifetime';
                    updates.is_pro = true;
                    updates.subscription_tier = 'premium';
                    updates.subscription_limit = 99999;
                    updates.lifetime_purchase_date = new Date().toISOString();
                    updates.email_alerts_limit = 99999;
                    updates.stripe_subscription_id = null;
                } else {
                    updates.user_tier = 'pro';
                    updates.is_pro = true;
                    updates.subscription_tier = 'pro';
                    updates.subscription_limit = 99999;
                    updates.email_alerts_limit = 99999;
                    updates.subscription_interval = metadata.interval === 'yearly' ? 'annual' : 'monthly';
                    updates.stripe_subscription_id = session.subscription as string;
                }

                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update(updates)
                    .eq('id', userId);

                if (error) {
                    console.error('[Webhook] Database update failed:', error);
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
                }

                await supabaseAdmin
                    .from('profiles')
                    .update({ payment_error: null })
                    .eq('id', userId);

                await logSubscriptionEvent(
                    userId,
                    'upgrade',
                    'free',
                    isLifetime ? 'lifetime' : 'pro',
                    event.id,
                    { interval: metadata.interval }
                );

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
                            userId
                        });
                    }
                } catch (emailErr) {
                    console.error('[Webhook] Failed to send upgrade email:', emailErr);
                }
                break;
            }

            // ─── Subscription Updated (plan change) ───
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const user = await findUserByCustomer(customerId);

                if (!user) {
                    break;
                }

                if (subscription.cancel_at_period_end && !user.cancellation_scheduled) {
                    const cancellationDate = (subscription as any).cancel_at
                        ? new Date((subscription as any).cancel_at * 1000)
                        : new Date((subscription as any).current_period_end * 1000);

                    const reactivationToken = crypto.randomBytes(32).toString('hex');

                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            cancellation_scheduled: true,
                            cancellation_date: cancellationDate.toISOString(),
                            cancellation_reason: 'stripe_portal',
                            previous_tier: user.user_tier,
                            cancel_reactivation_token: reactivationToken
                        })
                        .eq('id', user.id);

                    const hoursUntil = (cancellationDate.getTime() - Date.now()) / (1000 * 60 * 60);

                    if (hoursUntil > 24) {
                        try {
                            const { render } = await import('@react-email/render');
                            const { default: CancellationWarning } = await import('@/lib/emails/CancellationWarning');
                            const { Resend } = await import('resend');
                            const resend = new Resend(process.env.RESEND_API_KEY);

                            const emailHtml = await render(CancellationWarning({
                                name: user.full_name || 'there',
                                tier: user.user_tier,
                                cancellationDate,
                                reactivationToken
                            }));

                            await resend.emails.send({
                                from: 'RemindMyBill <no-reply@remindmybill.com>',
                                to: user.email,
                                subject: 'Your subscription will end soon',
                                html: emailHtml
                            });
                        } catch (emailErr) {
                            console.error('[Webhook] Failed to send cancellation email:', emailErr);
                        }
                    }
                }

                if (!subscription.cancel_at_period_end && user.cancellation_scheduled) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            cancellation_scheduled: false,
                            cancellation_date: null,
                            cancellation_reason: null,
                            cancel_reactivation_token: null
                        })
                        .eq('id', user.id);
                }

                break;
            }

            // ─── Subscription Deleted ─
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;
                const customerId = subscription.customer as string;
                const user = await findUserByCustomer(customerId);

                if (!user) break;
                if (user.user_tier === 'lifetime') break;

                const previousTier = user.user_tier;
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        user_tier: 'free',
                        is_pro: false,
                        subscription_tier: 'free',
                        subscription_limit: 5,
                        subscription_interval: null,
                        sms_addon_enabled: false,
                        stripe_subscription_id: null,
                        email_alerts_limit: 3,
                        tier_updated_at: new Date().toISOString(),
                    })
                    .eq('id', user.id);

                if (!error) {
                    const { data: subs, error: subsError } = await supabaseAdmin
                        .from('subscriptions')
                        .select('id')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: true });

                    if (!subsError && subs && subs.length > 5) {
                        const subsToDisable = subs.slice(5).map(s => s.id);
                        await supabaseAdmin
                            .from('subscriptions')
                            .update({ is_enabled: false })
                            .in('id', subsToDisable);
                    }

                    // Set review flag AFTER disabling subscriptions
                    await supabaseAdmin
                        .from('profiles')
                        .update({ needs_subscription_review: true })
                        .eq('id', user.id);

                    await logSubscriptionEvent(
                        user.id,
                        'cancellation',
                        previousTier,
                        'free',
                        event.id
                    );

                    await sendConsolidatedDowngrade({ user, previousTier: getTierDisplayName(previousTier) });
                }
                break;
            }

            // ─── Invoice Payment Failed ──────────────────────────────────
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                const user = await findUserByCustomer(customerId);

                if (!user) break;

                const amount = (invoice.amount_due || 0) / 100;
                const attemptCount = invoice.attempt_count || 1;
                const email = invoice.customer_email || user.email;
                const hostedInvoiceUrl = invoice.hosted_invoice_url || '';

                let cardBrand = 'Card';
                let cardLast4 = '****';

                try {
                    const paymentMethodId = (invoice as any).default_payment_method as string || (invoice as any).payment_intent && (await stripe.paymentIntents.retrieve((invoice as any).payment_intent as string)).payment_method as string;
                    if (paymentMethodId) {
                        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
                        if (pm?.card) {
                            cardBrand = pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
                            cardLast4 = pm.card.last4;
                        }
                    }
                } catch (err) {
                    console.error('[Webhook] Failed to retrieve card details:', err);
                }

                // If not final attempt, send standard failed email (logged as dunning)
                if (attemptCount < 3) {
                    try {
                        const { sendPaymentFailedEmail } = await import('@/lib/email');
                        await sendPaymentFailedEmail({
                            email,
                            userName: user.full_name || 'Valued Customer',
                            attemptCount,
                            cardBrand,
                            cardLast4,
                            amount,
                            hostedInvoiceUrl,
                            userId: user.id
                        });
                    } catch (emailErr) {
                        console.error('[Webhook] Failed to send payment failed email:', emailErr);
                    }
                }

                await logSubscriptionEvent(
                    user.id,
                    'payment_failed',
                    user.user_tier,
                    user.user_tier,
                    event.id,
                    {
                        invoiceId: invoice.id,
                        amount: invoice.amount_due,
                        attempt_count: attemptCount,
                        card_brand: cardBrand,
                        card_last4: cardLast4
                    }
                );

                if (invoice.billing_reason === 'subscription_create') {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ payment_error: 'initial_signup_failed' })
                        .eq('id', user.id);
                    break;
                }

                if (attemptCount >= 3) {
                    const previousTier = user.user_tier;
                    const { error: profileError } = await supabaseAdmin
                        .from('profiles')
                        .update({
                            user_tier: 'free',
                            is_pro: false,
                            subscription_tier: 'free',
                            subscription_limit: 5,
                            email_alerts_limit: 3,
                            tier_updated_at: new Date().toISOString(),
                        })
                        .eq('id', user.id);

                    if (!profileError) {
                        const { data: subs, error: subsError } = await supabaseAdmin
                            .from('subscriptions')
                            .select('id')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: true });

                        if (!subsError && subs && subs.length > 5) {
                            const subsToDisable = subs.slice(5).map(s => s.id);
                            await supabaseAdmin
                                .from('subscriptions')
                                .update({ is_enabled: false })
                                .in('id', subsToDisable);
                        }

                        // Set review flag AFTER disabling subscriptions
                        await supabaseAdmin
                            .from('profiles')
                            .update({ needs_subscription_review: true })
                            .eq('id', user.id);

                        await logSubscriptionEvent(
                            user.id,
                            'downgrade',
                            previousTier,
                            'free',
                            event.id,
                            { reason: 'payment_failed_final' }
                        );

                        // Send consolidated email instead of separate ones
                        await sendConsolidatedDowngrade({ user, previousTier: getTierDisplayName(previousTier) });
                    }
                }
                break;
            }

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
                }

                if (user) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ payment_error: null })
                        .eq('id', user.id);
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

function getTierDisplayName(tier: string) {
    switch (tier) {
        case 'pro': return 'Shield (Pro)';
        case 'lifetime': return 'Fortress (Lifetime)';
        default: return 'Guardian (Free)';
    }
}
