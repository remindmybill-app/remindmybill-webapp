'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isPro } from '@/lib/subscription-utils';

export async function syncSubscriptionLockStatus(userId: string) {
    const supabase = await getSupabaseServerClient();

    // 1. Get Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, is_pro')
        .eq('id', userId)
        .single();

    const userIsPro = isPro(profile?.subscription_tier, profile?.is_pro);

    // 2. Get Active Subscriptions (Ordered by created_at)
    const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, is_locked, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true }); // Oldest first = prioritized

    if (!subscriptions) return;

    const limit = userIsPro ? 1000 : 3;

    // 3. Determine which ones to lock
    const updates = subscriptions.map((sub: any, index: number) => {
        const shouldBeLocked = index >= limit;
        if (sub.is_locked !== shouldBeLocked) {
            return supabase
                .from('subscriptions')
                .update({ is_locked: shouldBeLocked })
                .eq('id', sub.id);
        }
        return null;
    });

    // 4. Execute updates
    const promises = updates.filter(Boolean);
    if (promises.length > 0) {
        await Promise.all(promises);
        console.log(`Synced lock status for user ${userId}: Updated ${promises.length} subscriptions.`);
        return { updated: true, count: promises.length };
    }

    return { updated: false };
}
