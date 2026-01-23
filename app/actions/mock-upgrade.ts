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

    revalidatePath('/')
    return { success: true }
}
