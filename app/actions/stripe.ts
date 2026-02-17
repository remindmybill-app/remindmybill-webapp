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
        console.error('[Stripe Action] Error creating portal session:', error)
        throw new Error('Failed to create portal session: ' + error.message)
    }
}
