'use server';

import { stripe } from '@/lib/stripe';
import { redirect } from 'next/navigation';

export async function createCheckoutSession(userId: string, email: string, period: 'monthly' | 'yearly') {
    // Resolve Price ID server-side to ensure access to secret env vars
    const priceId = period === 'yearly'
        ? process.env.STRIPE_PRO_PRICE_ID_YEARLY
        : process.env.STRIPE_PRO_PRICE_ID_MONTHLY;

    console.log(`[Stripe Action] Creating session for ${period}. ENV PRICE ID:`, priceId);

    // Strict validation as requested
    if (!priceId || priceId.includes('REPLACE_ME')) {
        const varName = period === 'yearly' ? 'STRIPE_PRO_PRICE_ID_YEARLY' : 'STRIPE_PRO_PRICE_ID_MONTHLY';
        throw new Error(`Invalid Price ID configuration. Please set ${varName} in your environment variables.`);
    }

    // Define origin for redirects
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            client_reference_id: userId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/dashboard?success=true`,
            cancel_url: `${origin}/pricing`,
        });

        if (session.url) {
            return { url: session.url };
        } else {
            throw new Error('No session URL returned');
        }

    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw new Error('Failed to create checkout session');
    }
}
