import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Monthly cron – resets email_alerts_used to 0 for free tier users.
 * Schedule: 0 0 1 * * (1st of each month at midnight UTC)
 */
export async function GET() {
    try {
        const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!hasServiceKey) {
            console.error('[Cron Reset] Missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ success: false, error: 'Missing service key' }, { status: 200 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        console.log('[Cron Reset] Resetting email_alerts_used for free tier users...');

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ email_alerts_used: 0 })
            .eq('user_tier', 'free');

        if (error) {
            console.error('[Cron Reset] Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 200 });
        }

        console.log('[Cron Reset] Reset complete for free tier users.');

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('[Cron Reset] Unexpected error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 200 });
    }
}
