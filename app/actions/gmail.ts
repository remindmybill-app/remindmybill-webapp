'use server'

import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function connectGmailAccount() {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const fullOrigin = origin?.includes('://') ? origin : `${protocol}://${origin}`

    console.log('[GmailAction] Starting Gmail OAuth flow', { fullOrigin })

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${fullOrigin}/auth/callback`,
            scopes: 'https://www.googleapis.com/auth/gmail.readonly',
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error) {
        console.error('[GmailAction] OAuth Error:', error.message)
        throw error
    }

    if (data.url) {
        console.log('[GmailAction] Redirecting to:', data.url)
        redirect(data.url)
    }

    return { error: 'No redirect URL returned' }
}

import { GoogleGenerativeAI } from "@google/generative-ai"

export async function scanGmailReceipts(accessToken: string, days: number = 90) {
    console.log(`[GmailAction] Scanning inbox for last ${days} days...`)

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No user found")

        // 1. Fetch Existing Subscriptions for matching
        const { data: existingSubs } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)

        // 2. Fetch from Gmail
        // RELAXED QUERY for debugging: just the time range
        const query = `newer_than:${days}d`

        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listRes.ok) {
            throw new Error(`Gmail API error: ${listRes.statusText}`)
        }

        const { messages } = await listRes.json()

        if (!messages || messages.length === 0) {
            return { success: true, count: 0, found: 0, scanned: 0, items: [], message: "No recently received emails found." }
        }

        // 3. Fetch details for found messages (up to 20)
        const emailDetails = await Promise.all(messages.slice(0, 20).map(async (m: any) => {
            const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            const data = await detail.json()

            // Extract Date and Subject from headers
            const dateHeader = data.payload.headers.find((h: any) => h.name === 'Date')?.value
            const subjectHeader = data.payload.headers.find((h: any) => h.name === 'Subject')?.value
            const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()
            const subject = subjectHeader || '(No Subject)'

            return {
                id: m.id,
                snippet: data.snippet,
                subject: subject,
                date: date
            }
        }))

        // 4. Map ALL emails directly to UI format for verification
        const processedSubs = emailDetails.map((email: any) => {
            // Find existing sub with same name (fuzzy) - just in case for debugging
            const match = existingSubs?.find(e =>
                e.name.toLowerCase().includes(email.subject.toLowerCase()) ||
                email.subject.toLowerCase().includes(e.name.toLowerCase())
            )

            // Calculate status
            let status: 'NEW' | 'EXISTS' | 'UPDATE' = 'NEW'
            let existing_id = undefined
            let existing_data = undefined

            if (match) {
                status = 'EXISTS'
                existing_id = match.id
                existing_data = {
                    name: match.name,
                    cost: match.cost,
                    currency: match.currency
                }
            }

            return {
                id: email.id,
                name: email.subject, // Use subject as name for now
                cost: 0.00, // Default to 0.00
                currency: 'USD',
                frequency: 'monthly',
                date: email.date,
                subject: email.subject,
                snippet: email.snippet,
                confidence: 100,
                status: status,
                existing_id,
                existing_data
            }
        })

        return {
            success: true,
            found: processedSubs.length,
            scanned: emailDetails.length,
            subs: processedSubs
        }

    } catch (error: any) {
        console.error('[GmailAction] Scan failed:', error)
        return { success: false, error: error.message }
    }
}
