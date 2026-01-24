
import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[Auth Callback] Request received', { origin, next, hasCode: !!code })

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Code exchange failed:', error.message, error.status)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
    }

    console.log('[Auth Callback] Code exchanged successfully', {
      userId: data.user?.id,
      session: !!data.session
    })

    // If we have a user, check if we're linking or just logging in
    // Note: Supabase handles linking automatically if the user is already signed in
    // and the provider identity is new to them.

    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    let redirectUrl = `${origin}${next}`
    if (!isLocalEnv && forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`
    }

    console.log('[Auth Callback] Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  }

  console.error('[Auth Callback] No code provided in query params')
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=No+code+provided`)
}

