'use server'

import { createClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { generateText } from '@/lib/openai-client'

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

        // Limiting to 50 results for cost and speed control
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listRes.ok) {
            throw new Error(`Gmail API error: ${listRes.statusText}`)
        }

        const { messages } = await listRes.json()

        if (!messages || messages.length === 0) {
            return { success: true, count: 0, found: 0, scanned: 0, items: [], message: "No recently received bills found." }
        }

        // 3. Fetch details for found messages (Up to 50)
        const emailDetails = await Promise.all(messages.slice(0, 50).map(async (m: any) => {
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

        // 4. Batch Parse with OpenAI (gpt-4o-mini)
        const AI_KEYWORDS = ["invoice", "receipt", "subscription", "renewal", "payment", "bill", "plan"];

        const aiResults = await Promise.all(emailDetails.map(async (email: any) => {
            const lowerSubject = email.subject.toLowerCase();
            const lowerSnippet = email.snippet.toLowerCase();
            const hasKeyword = AI_KEYWORDS.some(k => lowerSubject.includes(k) || lowerSnippet.includes(k));

            // FALLBACK LOGIC (Regex)
            const getFallback = () => {
                const amountMatch = (email.subject + email.body).match(/[€$£]\s?(\d+(\.\d{1,2})?)/) || (email.subject + email.body).match(/(\d+(\.\d{1,2})?)\s?(USD|EUR|GBP)/i);
                return {
                    is_subscription: hasKeyword,
                    merchant_name: email.subject.split(/[:\-–]/)[0].trim().substring(0, 30),
                    amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
                    currency: amountMatch ? (amountMatch[0].includes('€') ? 'EUR' : amountMatch[0].includes('£') ? 'GBP' : 'USD') : 'USD',
                    billing_date: email.date,
                    billing_frequency: 'monthly' as const
                };
            };

            if (!hasKeyword) return null;

            try {
                const prompt = `You are a financial data extractor.
                Given this email's subject and body, extract subscription or bill info if present.
                Return ONLY JSON, no explanation.

                JSON shape:
                {
                  "is_subscription": boolean,
                  "merchant_name": string | null,
                  "amount": number | null,
                  "currency": string | null,
                  "billing_frequency": "monthly" | "yearly" | "one_time" | null,
                  "billing_date": string | null
                }

                Email Info:
                - Subject: ${email.subject}
                - Snippet: ${email.snippet}
                - Body: ${email.body.substring(0, 800)}

                If this is not a bill/subscription, return { "is_subscription": false }.`;

                const text = await generateText(prompt);
                if (!text) return getFallback();

                const ai = JSON.parse(text.replace(/```json|```/g, "").trim());
                if (!ai.is_subscription) return null;

                return ai;
            } catch (err) {
                console.error(`[OpenAI] Extraction failed for ${email.id}:`, err);
                return getFallback();
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
                const date = ai.billing_date || ai.date || email.date
                const frequency = ai.billing_frequency || ai.frequency || 'monthly'

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
