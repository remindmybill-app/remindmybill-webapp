import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16' as any,
    typescript: true,
});

// ─── Stripe Price IDs (from environment variables) ──────────────────────────
// Set these in your .env.local / Vercel Environment Variables
// Find them in: Stripe Dashboard → Product Catalog → Click Product → Copy "Price API ID"

// Pro (Shield) tier
export const PRO_PRICE_ID_MONTHLY = process.env.STRIPE_PRO_PRICE_ID_MONTHLY || 'price_REPLACE_ME_MONTHLY';
export const PRO_PRICE_ID_YEARLY = process.env.STRIPE_PRO_PRICE_ID_YEARLY || 'price_REPLACE_ME_YEARLY';

// Lifetime (Fortress) tier — one-time payment
export const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || 'price_REPLACE_ME_LIFETIME';

// SMS Add-On for Pro users — recurring monthly
export const SMS_ADDON_PRICE_ID = process.env.STRIPE_SMS_ADDON_PRICE_ID || 'price_REPLACE_ME_SMS';

// SMS Add-On for Lifetime users — recurring annual
export const LIFETIME_SMS_PRICE_ID = process.env.STRIPE_LIFETIME_SMS_PRICE_ID || 'price_REPLACE_ME_LIFETIME_SMS';
