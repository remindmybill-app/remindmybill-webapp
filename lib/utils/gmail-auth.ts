import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { fetchNewAccessToken } from "@/app/actions/gmail"

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

export async function getGmailToken(): Promise<string | null> {
    const supabase = getSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()

    // Use live session token if available
    if (session?.provider_token) {
        return session.provider_token
    }

    // Fall back to stored refresh token
    const { data: profile } = await supabase
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', session?.user?.id)
        .single()

    if (!profile?.google_refresh_token) return null

    // Exchange refresh token for new access token via Google (using server action to protect secret)
    const accessToken = await fetchNewAccessToken(profile.google_refresh_token)
    
    if (!accessToken) return null

    // Save the new access token back to profiles
    await supabase
        .from('profiles')
        .update({ google_access_token: accessToken })
        .eq('id', session?.user?.id)

    return accessToken
}
