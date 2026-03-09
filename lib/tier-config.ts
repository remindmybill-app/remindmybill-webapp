import type { UserTier } from './types'

// ─── Stripe Price IDs (from environment) ────────────────────────────────────
export const STRIPE_PRICE_IDS = {
    PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID_MONTHLY || 'price_REPLACE_ME_MONTHLY',
    PRO_ANNUAL: process.env.STRIPE_PRO_PRICE_ID_YEARLY || 'price_REPLACE_ME_YEARLY',
    LIFETIME: process.env.STRIPE_LIFETIME_PRICE_ID || 'price_REPLACE_ME_LIFETIME',
} as const

// ─── Tier Display Names ─────────────────────────────────────────────────────
export const TIER_NAMES: Record<UserTier, string> = {
    free: 'Free',
    pro: 'Pro',
    lifetime: 'Lifetime',
}

// ─── Tier Limits ────────────────────────────────────────────────────────────
export const TIER_LIMITS: Record<UserTier, { subscriptions: number; emailAlerts: number }> = {
    free: { subscriptions: 5, emailAlerts: 3 },
    pro: { subscriptions: Infinity, emailAlerts: Infinity },
    lifetime: { subscriptions: Infinity, emailAlerts: Infinity },
}

// ─── Feature Permissions ────────────────────────────────────────────────────
export type Feature =
    | 'basic_dashboard'
    | 'health_score'
    | 'trust_center_read'
    | 'trust_center_write'
    | 'advanced_analytics'
    | 'unlimited_tracking'
    | 'unlimited_alerts'
    | 'export_reports'
    | 'payment_calendar'

export const TIER_PERMISSIONS: Record<UserTier, Feature[]> = {
    free: ['basic_dashboard', 'health_score', 'trust_center_read'],
    pro: [
        'basic_dashboard', 'health_score', 'trust_center_read', 'trust_center_write',
        'advanced_analytics', 'unlimited_tracking', 'unlimited_alerts',
        'export_reports', 'payment_calendar',
    ],
    lifetime: [
        'basic_dashboard', 'health_score', 'trust_center_read', 'trust_center_write',
        'advanced_analytics', 'unlimited_tracking', 'unlimited_alerts',
        'export_reports', 'payment_calendar',
    ],
}

// ─── Pricing Display ────────────────────────────────────────────────────────
export const TIER_PRICING = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 4.99, annual: 39 },
    lifetime: { oneTime: 99 },
} as const

// ─── Tier Badge Styles ──────────────────────────────────────────────────────
export const TIER_BADGES: Record<UserTier, { emoji: string; label: string; className: string }> = {
    free: {
        emoji: '🛡️',
        label: 'Free',
        className: 'bg-zinc-500/20 text-zinc-400',
    },
    pro: {
        emoji: '✨',
        label: 'Pro',
        className: 'bg-emerald-500/20 text-emerald-500',
    },
    lifetime: {
        emoji: '👑',
        label: 'Lifetime',
        className: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400',
    },
}
