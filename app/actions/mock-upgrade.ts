'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function upgradeUserToPro(userId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('profiles')
        .update({
            subscription_tier: 'premium',
            subscription_limit: 100,
            subscription_status: 'active'
        })
        .eq('id', userId)

    if (error) {
        throw new Error(error.message)
    }

    // Send Plan Change Email (Non-blocking)
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single()

        if (profile?.email) {
            const { sendPlanChangeEmail } = await import('@/lib/email')
            await sendPlanChangeEmail({
                email: profile.email,
                userName: profile.full_name?.split(' ')[0] || 'User',
                planName: 'Pro Plan',
                price: '$3.99',
                limit: 100,
                isUpgrade: true,
                date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            })
        }
    } catch (emailError) {
        console.error('[Action] Upgrade email failed:', emailError)
    }

    revalidatePath('/')
    return { success: true }
}

export async function downgradeUserToFree(userId: string) {
    const supabase = await createClient()

    // 1. Update profile to free tier (SOFT downgrade - no data deletion)
    const { error } = await supabase
        .from('profiles')
        .update({
            is_pro: false,
            subscription_tier: 'free',
            subscription_limit: 3,
            subscription_status: 'active'
        })
        .eq('id', userId)

    if (error) {
        throw new Error(error.message)
    }

    // 2. Trigger lock sync to apply the "locked" state to excess subscriptions
    try {
        const { syncSubscriptionLockStatus } = await import('./subscription-lock')
        await syncSubscriptionLockStatus(userId)
        console.log('[Action] Lock status synced after downgrade')
    } catch (lockError) {
        console.error('[Action] Lock sync failed after downgrade:', lockError)
        // Non-blocking: locks will be applied on next dashboard load anyway
    }

    // 3. Send Plan Change Email (Non-blocking)
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single()

        if (profile?.email) {
            const { sendPlanChangeEmail } = await import('@/lib/email')
            await sendPlanChangeEmail({
                email: profile.email,
                userName: profile.full_name?.split(' ')[0] || 'User',
                planName: 'Essential',
                price: '$0.00',
                limit: 3,
                isUpgrade: false,
                date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            })
        }
    } catch (emailError) {
        console.error('[Action] Downgrade email failed:', emailError)
    }

    revalidatePath('/')
    return { success: true }
}
