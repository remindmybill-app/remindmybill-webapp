import type { Profile, UserTier } from './types'
import { TIER_PERMISSIONS, TIER_LIMITS, type Feature } from './tier-config'

/**
 * Check if a user's tier grants access to a specific feature.
 */
export function checkTierAccess(userTier: UserTier, requiredFeature: Feature): boolean {
    return TIER_PERMISSIONS[userTier]?.includes(requiredFeature) ?? false
}

/**
 * Check if a user can add another subscription (enforces free tier limit of 7).
 */
export function canAddSubscription(user: Pick<Profile, 'user_tier' | 'current_usage'>): {
    allowed: boolean
    reason?: string
} {
    const tier = user.user_tier || 'free'
    const limit = TIER_LIMITS[tier].subscriptions

    if (tier === 'free' && user.current_usage >= limit) {
        return { allowed: false, reason: `Free tier limit of ${limit} subscriptions reached` }
    }
    return { allowed: true }
}

/**
 * Check if a user can send an email alert (enforces free tier limit of 3/month).
 */
export function canSendEmailAlert(user: Pick<Profile, 'user_tier' | 'email_alerts_used' | 'email_alerts_limit'>): {
    allowed: boolean
    reason?: string
} {
    const tier = user.user_tier || 'free'
    if (tier === 'free') {
        const used = user.email_alerts_used ?? 0
        const limit = user.email_alerts_limit ?? TIER_LIMITS.free.emailAlerts
        if (used >= limit) {
            return { allowed: false, reason: 'Free tier monthly alert limit reached' }
        }
    }
    return { allowed: true }
}

/**
 * Check if a user has access to pro-level features (pro or lifetime).
 */
export function hasProAccess(tier?: UserTier | string | null): boolean {
    return tier === 'pro' || tier === 'lifetime'
}
