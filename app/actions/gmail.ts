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

function getEmailBody(payload: any): string {
    let body = "";
    if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, "base64").toString("utf8");
    } else if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === "text/plain" && part.body && part.body.data) {
                body = Buffer.from(part.body.data, "base64").toString("utf8");
                break;
            } else if (part.parts) {
                body = getEmailBody(part);
                if (body) break;
            }
        }
    }
    return body;
}

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
        const query = `newer_than:${days}d (subject:(receipt OR invoice OR bill OR "payment processed" OR "renews on" OR "order confirmation" OR total) OR (receipt OR invoice OR bill OR "payment processed" OR "renews on" OR "order confirmation" OR total))`

        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listRes.ok) {
            throw new Error(`Gmail API error: ${listRes.statusText}`)
        }

        const { messages } = await listRes.json()

        if (!messages || messages.length === 0) {
            return { success: true, count: 0, found: 0, scanned: 0, items: [], message: "No recently received bills found." }
        }

        // 3. Fetch details for found messages
        const emailDetails = await Promise.all(messages.slice(0, 20).map(async (m: any) => {
            const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            const data = await detail.json()

            const dateHeader = data.payload.headers.find((h: any) => h.name === 'Date')?.value
            const subjectHeader = data.payload.headers.find((h: any) => h.name === 'Subject')?.value
            const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()
            const subject = subjectHeader || '(No Subject)'

            // Decoded Body for better AI context
            const body = getEmailBody(data.payload).substring(0, 1500)

            return {
                id: m.id,
                snippet: data.snippet,
                subject: subject,
                date: date,
                body: body
            }
        }))

        // 4. Batch Parse with Gemini Flash (Auditor Mode)
        const { geminiFlash: model } = require("@/lib/gemini")

        const aiResults = await Promise.all(emailDetails.map(async (email: any) => {
            try {
                const prompt = `You are a financial data auditor.
                Analyze this email text to extract billing/subscription data.
                
                CONTENT:
                Subject: ${email.subject}
                Body: ${email.body || email.snippet}
                Email Date: ${email.date}
                
                RULES:
                1. Is this a Bill, Receipt, or Subscription Invoice?
                   - If it's a security alert, login notification, newsletter, or shipping update: Return ONLY "null".
                2. Extract:
                   - merchant_name: The service/company provider.
                   - amount: The GRAND TOTAL only.
                   - currency: e.g. USD, EUR.
                   - date: The actual billing date from text (ISO8601).
                   - frequency: "monthly" or "yearly".
                
                Return JSON only: { "merchant_name": "string", "amount": number, "currency": "string", "date": "ISO8601", "frequency": "monthly" | "yearly" }.`

                const result = await model.generateContent(prompt)
                let text = result.response.text().trim()

                if (text.includes("```")) {
                    text = text.replace(/```json|```/g, "").trim()
                }

                if (text.toLowerCase() === 'null') return null

                const ai = JSON.parse(text)

                // Safety: Regex Price Fallback if AI missed it
                if (ai && ai.amount === 0) {
                    const combined = `${email.subject} ${email.body}`
                    const match = combined.match(/\$\s?(\d+\.\d{2})/i) || combined.match(/(\d+\.\d{2})\s?USD/i)
                    if (match) ai.amount = parseFloat(match[1])
                }

                return ai
            } catch (err) {
                console.error(`FULL AI ERROR (Gmail Email ${email.id}):`, err)
                return null
            }
        }))

        // 5. Map results
        const processedSubs = emailDetails
            .map((email: any, index: number) => {
                const ai = aiResults[index]
                if (!ai) return null

                const name = ai.merchant_name || email.subject
                const cost = ai.amount || 0.00
                const currency = ai.currency || 'USD'
                const date = ai.date || email.date
                const frequency = ai.frequency || 'monthly'

                // Skip if name is still gibberish/empty (unlikely)
                if (!name || name === '(No Subject)') return null

                // Find existing sub with same name (fuzzy)
                const match = existingSubs?.find(e =>
                    e.name.toLowerCase().includes(name.toLowerCase()) ||
                    name.toLowerCase().includes(e.name.toLowerCase())
                )

                // Calculate status
                let status: 'NEW' | 'EXISTS' | 'UPDATE' = 'NEW'
                let existing_id = undefined
                let existing_data = undefined

                if (match) {
                    const samePrice = Math.abs(match.cost - cost) < 0.01
                    if (samePrice) {
                        status = 'EXISTS'
                    } else {
                        status = 'UPDATE'
                    }
                    existing_id = match.id
                    existing_data = {
                        name: match.name,
                        cost: match.cost,
                        currency: match.currency
                    }
                }

                return {
                    id: email.id,
                    name: name,
                    cost: cost,
                    currency: currency,
                    frequency: frequency,
                    date: date,
                    subject: email.subject,
                    snippet: email.snippet,
                    confidence: ai ? 90 : 40,
                    status: status,
                    existing_id,
                    existing_data
                }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)

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
