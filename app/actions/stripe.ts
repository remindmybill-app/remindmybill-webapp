'use server';

import { stripe } from '@/lib/stripe';
import type { UserTier } from '@/lib/types';

interface CheckoutParams {
    userId: string
    email: string
    tier: 'pro' | 'lifetime'
    interval?: 'monthly' | 'yearly'
}

/**
 * Creates a Stripe Checkout session for Pro subscription or Lifetime one-time payment.
 */
export async function createCheckoutSession(params: CheckoutParams) {
    const { userId, email, tier, interval = 'monthly' } = params

    // Resolve price IDs server-side
    const priceIdMap: Record<string, string | undefined> = {
        'pro-monthly': process.env.STRIPE_PRO_PRICE_ID_MONTHLY,
        'pro-yearly': process.env.STRIPE_PRO_PRICE_ID_YEARLY,
        'lifetime': process.env.STRIPE_LIFETIME_PRICE_ID,
    }

    const priceKey = tier === 'lifetime' ? 'lifetime' : `pro-${interval}`
    const priceId = priceIdMap[priceKey]

    console.log(`[Stripe Action] Creating ${tier} (${interval}) session. Price ID:`, priceId)

    if (!priceId || priceId.includes('REPLACE_ME')) {
        throw new Error(
            `Invalid Price ID for ${priceKey}. Please set the corresponding environment variable.`
        )
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

    // Build line items
    const lineItems: Array<{ price: string; quantity: number }> = [
        { price: priceId, quantity: 1 },
    ]

    try {
        const isLifetime = tier === 'lifetime'

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            client_reference_id: userId,
            line_items: lineItems,
            mode: isLifetime ? 'payment' : 'subscription',
            metadata: {
                userId,
                tier,
                interval: isLifetime ? 'one-time' : interval,
            },
            success_url: `${origin}/dashboard?checkout=success&tier=${tier}`,
            cancel_url: `${origin}/pricing`,
            ...(isLifetime ? {} : {
                subscription_data: {
                    metadata: { userId, tier },
                },
            }),
        })

        if (session.url) {
            return { url: session.url }
        } else {
            throw new Error('No session URL returned from Stripe')
        }
    } catch (error: any) {
        console.error('[Stripe Action] Error creating checkout session:', error)
        throw new Error('Failed to create checkout session: ' + error.message)
    }
}

/**
 * Creates a Stripe Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(stripeCustomerId: string) {
    if (!stripeCustomerId) {
        throw new Error('No Stripe customer ID provided')
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${origin}/settings?tab=billing`,
        })

        return { url: session.url }
    } catch (error: any) {
        throw new Error('Failed to create portal session: ' + error.message)
    }
}

/**
 * Reactivates a subscription that was scheduled for cancellation.
 */
export async function reactivateSubscription(token: string) {
    if (!token) {
        throw new Error("Invalid reactivation token")
    }

    const { createClient } = await import('@/lib/supabase-server') // Dynamic import to avoid circular dep issues if any
    const supabase = await createClient()

    // 1. Verify token & get user
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('cancel_reactivation_token', token)
        .single()

    if (!profile) {
        throw new Error("Invalid or expired reactivation token")
    }

    if (!profile.cancellation_scheduled) {
        return { success: true, message: "Subscription already active" }
    }

    // 2. Remove cancellation from Stripe
    if (profile.stripe_subscription_id) {
        try {
            await stripe.subscriptions.update(profile.stripe_subscription_id, {
                cancel_at_period_end: false,
            })
        } catch (err: any) {
            console.error("[Stripe Action] Reactivation failed:", err)
            throw new Error("Failed to reactivate with Stripe")
        }
    }

    // 3. Update Profile
    const { error } = await supabase
        .from('profiles')
        .update({
            cancellation_scheduled: false,
            cancellation_date: null,
            cancellation_reason: null,
            cancellation_feedback: null,
            cancel_reactivation_token: null, // Consume token
        })
        .eq('id', profile.id)

    if (error) {
        throw new Error("Failed to update profile status")
    }

    // 4. Send Confirmation Email (Optional logic, can reuse ReactivationEmail here if desired)
    // For now, return success
    return { success: true }
}
