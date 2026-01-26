'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upgradeUserToPro(userId: string) {
    const supabase = await getSupabaseServerClient()

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
            await sendPlanChangeEmail(
                profile.email,
                profile.full_name?.split(' ')[0] || 'User',
                'Pro Plan',
                '$3.99'
            )
        }
    } catch (emailError) {
        console.error('[Action] Upgrade email failed:', emailError)
    }

    revalidatePath('/')
    return { success: true }
}

export async function downgradeUserToFree(userId: string) {
    const supabase = await getSupabaseServerClient()

    const { error } = await supabase
        .from('profiles')
        .update({
            subscription_tier: 'free',
            subscription_limit: 3,
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
            await sendPlanChangeEmail(
                profile.email,
                profile.full_name?.split(' ')[0] || 'User',
                'Essential',
                '$0.00'
            )
        }
    } catch (emailError) {
        console.error('[Action] Downgrade email failed:', emailError)
    }

    revalidatePath('/')
    return { success: true }
}
