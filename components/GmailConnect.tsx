
'use client'

import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function GmailConnect() {
    const handleConnectGmail = async () => {
        const supabase = createClient()

        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/gmail.readonly',
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
    }

    return (
        <Button onClick={handleConnectGmail}>
            Connect Gmail
        </Button>
    )
}
