import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  if (!process.env.VAPID_EMAIL || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error("VAPID keys are missing from environment variables")
    return NextResponse.json({ error: 'Push notifications are not configured on the server' }, { status: 500 })
  }

  webpush.setVapidDetails(
    'mailto:' + process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const { userId, title, body, url } = await req.json()
  const supabase = await getSupabaseServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_subscription, push_notifications_enabled')
    .eq('id', userId)
    .single()

  if (!profile?.push_subscription || !profile.push_notifications_enabled) {
    return NextResponse.json({ error: 'No subscription' }, { status: 400 })
  }

  try {
    await webpush.sendNotification(
      JSON.parse(profile.push_subscription),
      JSON.stringify({ title, body, url })
    )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
