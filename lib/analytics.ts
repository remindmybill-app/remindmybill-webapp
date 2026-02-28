import { Subscription } from '@/lib/types';

/**
 * Calculates a health score for the user's subscription portfolio.
 * 
 * Base Score: 100
 * Penalties:
 * - Duplicates: -15 per duplicate set (fuzzy match on name)
 * - Risky Trials: -20 each (trial ending within 3 days)
 * - Missing Category: -5 each (category is "Other" or missing)
 * 
 * Floor: 0
 */
export function calculateHealthScore(subscriptions: Subscription[]): number {
    if (!subscriptions || subscriptions.length === 0) {
        return 100; // Perfect score if no subscriptions
    }

    let score = 100;

    // Only consider active subscriptions
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active' && s.is_enabled !== false);

    // Penalty 1: Duplicates (fuzzy name matching)
    const nameCounts = new Map<string, number>();
    activeSubscriptions.forEach(sub => {
        const normalizedName = sub.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        nameCounts.set(normalizedName, (nameCounts.get(normalizedName) || 0) + 1);
    });

    let duplicateSets = 0;
    nameCounts.forEach((count) => {
        if (count > 1) {
            duplicateSets++;
        }
    });
    score -= duplicateSets * 15;

    // Penalty 2: Risky Trials (trial ending within 3 days)
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    activeSubscriptions.forEach(sub => {
        // Assuming there's an is_trial field or we check for specific naming patterns
        // For now, let's check if the name contains "trial" or if there's a trial flag
        const isTrial = (sub as any).is_trial === true ||
            sub.name.toLowerCase().includes('trial');

        if (isTrial) {
            const renewalDate = new Date(sub.renewal_date);
            if (renewalDate <= threeDaysFromNow) {
                score -= 20;
            }
        }
    });

    // Penalty 3: Missing or "Other" Category
    activeSubscriptions.forEach(sub => {
        if (!sub.category || sub.category.toLowerCase() === 'other' || sub.category === '') {
            score -= 5;
        }
    });

    // Floor the score at 0
    return Math.max(0, score);
}

/**
 * Get a text label for the health score
 */
export function getHealthScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Attention';
    if (score >= 30) return 'At Risk';
    return 'Critical';
}

/**
 * Get color class for the health score
 */
export function getHealthScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
}
