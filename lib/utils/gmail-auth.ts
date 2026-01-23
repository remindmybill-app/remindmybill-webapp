import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export async function connectGmailAccount() {
    const supabase = getSupabaseBrowserClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/dashboard`,
            scopes: 'https://www.googleapis.com/auth/gmail.readonly',
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    })

    if (error) throw error
    return data
}

export async function getGmailToken() {
    const supabase = getSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.provider_token) {
        return null
    }

    return session.provider_token
}
