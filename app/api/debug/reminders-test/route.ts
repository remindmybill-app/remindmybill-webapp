import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DEBUG ENDPOINT — remove after verifying renewal_date matching.
 *
 * Usage:
 *   GET /api/debug/reminders-test?date=2026-03-28
 *
 * Returns subscriptions that the cron query would match for the given date.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // expected: YYYY-MM-DD

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return NextResponse.json(
            { error: 'Missing or invalid ?date=YYYY-MM-DD query parameter' },
            { status: 400 }
        );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json(
            { error: 'Server configuration error (missing env vars)' },
            { status: 500 }
        );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Range-based query (mirrors the updated cron logic)
    const dayStart = `${dateParam}T00:00:00.000Z`;
    const dayEnd   = `${dateParam}T23:59:59.999Z`;

    const { data: subs, error } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, name, renewal_date, status, is_enabled, is_locked, cost, currency, category')
        .gte('renewal_date', dayStart)
        .lte('renewal_date', dayEnd)
        .eq('status', 'active')
        .eq('is_enabled', true)
        .eq('is_locked', false);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also return raw rows for the date without filters for debugging
    const { data: rawRows, error: rawError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, name, renewal_date, status, is_enabled, is_locked')
        .gte('renewal_date', dayStart)
        .lte('renewal_date', dayEnd);

    return NextResponse.json({
        query_date: dateParam,
        dayStart,
        dayEnd,
        matched_count: subs?.length ?? 0,
        matched_subscriptions: subs,
        raw_rows_for_date: rawRows,
        raw_error: rawError?.message ?? null,
    });
}
