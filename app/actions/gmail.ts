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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No user found")

        // 1. Fetch Existing Subscriptions for matching
        const { data: existingSubs } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)

        // 2. Fetch from Gmail
        // Broader query: searches full text, last 90 days
        const query = "newer_than:90d (receipt OR invoice OR bill OR subscription OR payment OR renewal OR order OR confirmation OR \"Test Receipt\")"

        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=25`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listRes.ok) {
            throw new Error(`Gmail API error: ${listRes.statusText}`)
        }

        const { messages } = await listRes.json()

        if (!messages || messages.length === 0) {
            return { success: true, count: 0, found: 0, scanned: 0, items: [], message: "No receipts found." }
        }

        // 3. Fetch details for first 15
        const emailDetails = await Promise.all(messages.slice(0, 15).map(async (m: any) => {
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

        // 4. AI Extraction
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
        Analyze these email details for subscription receipts: ${JSON.stringify(emailDetails)}.
        
        CRITICAL INSTRUCTIONS:
        1. Look for explicit keywords: "Total", "Amount Charged", "Billing Period", "Invoice".
        2. High Priority Services: "Google Cloud", "AWS", "Netflix", "Spotify", "Hulu", "Adobe".
        3. If the subject/snippet is messy (e.g., "Fwd: Your invoice #123"), extract the "merchant_name" as the primary title (e.g., "Netflix").
        4. Associate each found subscription with the correct "id", "date", "subject", and "snippet" from the input.
        
        Return a Strict JSON array of objects:
        [{
            "id": "original_email_id",
            "name": "Service Name",
            "cost": 0.00,
            "currency": "USD",
            "frequency": "monthly" | "yearly",
            "date": "ISO_DATE",
            "subject": "The original email subject",
            "snippet": "Short snippet of the email",
            "confidence": 0-100
        }]
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Clean markdown
        const cleanedText = text.replace(/```json|```/g, '').trim()
        const detectedSubscriptions = JSON.parse(cleanedText)

        // 5. Duplicate & Conflict Detection
        const processedSubs = detectedSubscriptions.map((sub: any) => {
            // Find existing sub with same name (fuzzy)
            const match = existingSubs?.find(e =>
                e.name.toLowerCase().includes(sub.name.toLowerCase()) ||
                sub.name.toLowerCase().includes(e.name.toLowerCase())
            )

            if (match) {
                const samePrice = Math.abs(match.cost - sub.cost) < 0.01
                // Same name + Same price = Duplicate
                if (samePrice) {
                    return { ...sub, status: 'duplicate', existing_id: match.id }
                }
                // Same name + Different price = Conflict
                else {
                    return {
                        ...sub,
                        status: 'conflict',
                        existing_id: match.id,
                        existing_data: {
                            name: match.name,
                            cost: match.cost,
                            currency: match.currency
                        }
                    }
                }
            }

            // No match found = New
            return { ...sub, status: 'new' }
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
