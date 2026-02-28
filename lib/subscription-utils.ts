/**
 * Subscription tier utility functions
 * Provides consistent handling of subscription tiers across the app
 */

import type { UserTier } from './types'
import { TIER_NAMES, TIER_LIMITS } from './tier-config'

/**
 * Check if user has Pro-level access (pro or lifetime).
 * Accepts both the new `user_tier` field and legacy `is_pro` boolean.
 */
export const isPro = (tier?: string | null, isProBool?: boolean | null): boolean => {
    if (isProBool === true) return true
    return tier === 'pro' || tier === 'premium' || tier === 'lifetime'
}

/**
 * Check if user is on the free tier.
 */
export function isFree(tier?: string | null): boolean {
    return !tier || tier === 'free'
}

/**
 * Check if user has the lifetime tier.
 */
export function isLifetime(tier?: string | null): boolean {
    return tier === 'lifetime'
}

/**
 * Get the marketing display name for a tier.
 */
export function getTierDisplayName(tier?: string | null): string {
    if (isLifetime(tier)) return TIER_NAMES.lifetime   // "Fortress"
    if (isPro(tier)) return TIER_NAMES.pro              // "Shield"
    return TIER_NAMES.free                               // "Guardian"
}

/**
 * Get subscription tracking limit for a tier.
 * Free = 5, Pro/Lifetime = Infinity (unlimited).
 */
export function getTierLimit(tier?: string | null): number {
    if (isPro(tier) || isLifetime(tier)) return Infinity
    return TIER_LIMITS.free.subscriptions // 5
}

/**
 * Get the email alert limit for a tier.
 */
export function getAlertLimit(tier?: string | null): number {
    if (isPro(tier) || isLifetime(tier)) return Infinity
    return TIER_LIMITS.free.emailAlerts // 3
}

/**
 * Get the normalized UserTier value from legacy or mixed tier strings.
 */
export function normalizeUserTier(tier?: string | null): UserTier {
    if (tier === 'lifetime') return 'lifetime'
    if (tier === 'pro' || tier === 'premium') return 'pro'
    return 'free'
}
