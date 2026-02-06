import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16' as any,
    typescript: true,
});

// ⚠️ REPLACE WITH YOUR REAL STRIPE PRICE IDS
// Find these in: Stripe Dashboard → Product Catalog → Click Product → Copy "Price API ID"
export const PRO_PRICE_ID_MONTHLY = process.env.STRIPE_PRO_PRICE_ID_MONTHLY || 'price_REPLACE_ME_MONTHLY';
export const PRO_PRICE_ID_YEARLY = process.env.STRIPE_PRO_PRICE_ID_YEARLY || 'price_REPLACE_ME_YEARLY';
