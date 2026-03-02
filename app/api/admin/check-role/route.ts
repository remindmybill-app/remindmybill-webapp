import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This route runs in the Node.js runtime (not Edge).
// It exists so that middleware.ts (Edge runtime) can check admin status
// without importing Node.js-only packages.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const secret = request.headers.get('x-internal-secret')

    // Guard: only allow calls from our own middleware using a shared secret
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!userId) {
        return NextResponse.json({ isAdmin: false })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    )

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

    return NextResponse.json({ isAdmin: !!profile?.is_admin })
}
