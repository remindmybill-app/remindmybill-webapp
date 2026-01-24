'use server'

import { createClient } from '@/lib/supabase-server'

export async function debugFetchLast5Emails(accessToken: string) {
    console.log('[DebugGmail] Starting raw fetch...')

    try {
        // 1. List last 5 messages (NO QUERY)
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!listRes.ok) {
            const errorText = await listRes.text()
            console.error('[DebugGmail] List failed:', listRes.status, errorText)
            return { error: `List failed: ${listRes.status} ${errorText}` }
        }

        const listData = await listRes.json()
        const messages = listData.messages

        if (!messages || messages.length === 0) {
            return { message: "No emails found in inbox." }
        }

        // 2. Fetch details for each
        const emails = await Promise.all(messages.map(async (m: any) => {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            const data = await detailRes.json()

            // Extract Subject
            const subjectHeader = data.payload.headers.find((h: any) => h.name === 'Subject')
            const subject = subjectHeader ? subjectHeader.value : '(No Subject)'

            return {
                id: m.id,
                snippet: data.snippet,
                subject: subject,
                date: data.internalDate ? new Date(parseInt(data.internalDate)).toISOString() : 'Unknown'
            }
        }))

        console.log('[DebugGmail] Fetched 5 emails:', emails)
        return { success: true, emails }

    } catch (error: any) {
        console.error('[DebugGmail] Critical fail:', error)
        return { error: error.message }
    }
}
