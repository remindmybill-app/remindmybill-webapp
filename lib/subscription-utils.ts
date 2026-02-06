/**
 * Subscription tier utility functions
 * Provides consistent handling of subscription tiers across the app
 */

export const isPro = (tier?: string | null, isProBool?: boolean | null): boolean => {
    if (isProBool === true) return true;
    return tier === 'pro' || tier === 'premium';
}

export function isFree(tier?: string | null): boolean {
    return !tier || tier === 'free'
}

export function getTierDisplayName(tier?: string | null): string {
    if (isPro(tier)) return 'Pro'
    return 'Free'
}

export function getTierLimit(tier?: string | null): number {
    if (isPro(tier)) return 100
    return 3
}
