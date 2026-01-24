'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function addSubscription(sub: {
    name: string
    cost: number
    currency: string
    frequency: string
    category?: string
    renewal_date?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        name: sub.name,
        cost: sub.cost,
        currency: sub.currency,
        frequency: sub.frequency,
        category: sub.category || 'Software',
        renewal_date: sub.renewal_date || new Date().toISOString(),
        status: 'active',
        trust_score: 100
    })

    if (error) {
        console.error('[Action] addSubscription Error:', error)
        throw new Error(error.message)
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateSubscription(id: string, sub: Partial<{
    name: string
    cost: number
    currency: string
    frequency: string
    category: string
    renewal_date: string
}>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const { error } = await supabase.from('subscriptions').update({
        ...sub,
        updated_at: new Date().toISOString()
    }).eq('id', id).eq('user_id', user.id)

    if (error) {
        console.error('[Action] updateSubscription Error:', error)
        throw new Error(error.message)
    }

    revalidatePath('/dashboard')
    return { success: true }
}
