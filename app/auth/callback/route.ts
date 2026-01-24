
import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[Auth Callback] Request received', { origin, next, hasCode: !!code })

  try {
    if (code) {
      const supabase = await createClient()

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[Auth Callback] Code exchange failed:', error)
        throw error // Re-throw to be caught by the catch block
      }

      console.log('[Auth Callback] Code exchanged successfully', {
        userId: data.user?.id,
        session: !!data.session
      })

      // If we have a user, check if we're linking or just logging in
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      let redirectUrl = `${origin}${next}`
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      }

      console.log('[Auth Callback] Redirecting to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    }

    // No code provided case
    console.error('[Auth Callback] No code provided in query params')
    return NextResponse.redirect(`${origin}/dashboard?error=TRUE&message=${encodeURIComponent('No code provided from OAuth provider.')}`)

  } catch (error: any) {
    console.error('[Auth Callback] Critical Error:', error)

    // VERBOSE ERROR REPORTING
    // We redirect the user to the dashboard with the exact error message
    // so it can be displayed in a toast.
    const errorMessage = error?.message || 'Unknown error occurred during authentication.'
    return NextResponse.redirect(`${origin}/dashboard?error=TRUE&message=${encodeURIComponent(errorMessage)}`)
  }
}

