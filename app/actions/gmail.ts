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

export async function scanGmailReceipts(accessToken: string) {
    console.log('[GmailAction] Scanning inbox with token...')

    try {
        // 1. Fetch from Gmail
        // Broader query: searches full text, last 90 days, includes loose terms
        const query = "newer_than:90d (receipt OR invoice OR bill OR subscription OR payment OR renewal OR order OR confirmation OR \"Test Receipt\" OR \"Netflix\")"

        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listRes.ok) {
            throw new Error(`Gmail API error: ${listRes.statusText}`)
        }

        const { messages } = await listRes.json()

        if (!messages || messages.length === 0) {
            return { success: true, count: 0, found: 0, scanned: 0, message: "No receipts found." }
        }

        // 2. Fetch details for first 10
        const emailDetails = await Promise.all(messages.slice(0, 10).map(async (m: any) => {
            const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            const data = await detail.json()

            // Extract Date from headers
            const dateHeader = data.payload.headers.find((h: any) => h.name === 'Date')?.value
            const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()

            return {
                id: m.id,
                snippet: data.snippet,
                date: date
            }
        }))

        // 3. AI Extraction
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
        Analyze these email details for subscription receipts: ${JSON.stringify(emailDetails)}.
        
        CRITICAL INSTRUCTIONS:
        1. Look for explicit keywords: "Total", "Amount Charged", "Billing Period", "Invoice".
        2. High Priority Services: "Google Cloud", "AWS", "Netflix", "Spotify", "Hulu", "Adobe".
        3. Associate each found subscription with the correct "id", "date", and "snippet" from the input.
        
        Return a Strict JSON array of objects:
        [{
            "id": "original_email_id",
            "name": "Service Name",
            "cost": 0.00,
            "currency": "USD",
            "frequency": "monthly" | "yearly",
            "date": "ISO_DATE",
            "snippet": "Short snippet of the email",
            "confidence": 0-100
        }]
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Clean markdown
        const cleanedText = text.replace(/```json|```/g, '').trim()
        const subscriptions = JSON.parse(cleanedText)

        // 4. Auto-Add High Confidence Logic
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error("No user found")

        let addedCount = 0

        for (const sub of subscriptions) {
            if (sub.confidence > 90) {
                // Check if already exists to avoid dupes (simple name check)
                const { data: existing } = await supabase
                    .from('subscriptions')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('name', sub.name)
                    .single()

                if (!existing) {
                    await supabase.from('subscriptions').insert({
                        user_id: user.id,
                        name: sub.name,
                        cost: sub.cost,
                        currency: sub.currency,
                        frequency: sub.frequency,
                        status: 'active',
                        trust_score: 100, // Default for auto-added
                        category: 'Software',
                        renewal_date: sub.date || new Date().toISOString()
                    })
                    addedCount++
                }
            }
        }

        return {
            success: true,
            count: addedCount,
            found: subscriptions.length,
            scanned: emailDetails.length,
            subs: subscriptions
        }

    } catch (error: any) {
        console.error('[GmailAction] Scan failed:', error)
        return { success: false, error: error.message }
    }
}
