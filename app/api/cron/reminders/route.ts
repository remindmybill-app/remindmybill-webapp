import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBillReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Returns the first day of the month for the given date as a YYYY-MM-DD string.
 */
function startOfMonth(date: Date): string {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

// This route should be called by Vercel Cron
export async function GET() {
    try {
        // 0. Configuration check & Logging
        const hasResendKey = !!process.env.RESEND_API_KEY;
        const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!hasResendKey || !hasServiceKey) {
            console.error('[Cron] Missing API Keys');
            return NextResponse.json({ success: false, error: 'Configuration error: Missing API Keys' }, { status: 200 });
        }

        // Initialize Admin Client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Calculate target date: Today + 3 Days
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 3);
        const formattedDate = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log(`[Cron] Reminders job started. Target date: ${formattedDate}`);

        // 2. Query Subscriptions
        const { data: subs, error: subsError } = await supabaseAdmin
            .from('subscriptions')
            .select('*, user_id')
            .eq('renewal_date', formattedDate)
            .eq('status', 'active')
            .eq('is_enabled', true)
            .eq('is_locked', false);

        if (subsError) {
            console.error('[Cron] Database error (subscriptions):', subsError);
            return NextResponse.json({
                success: false,
                error: subsError.message,
                phase: 'fetch_subscriptions'
            }, { status: 200 });
        }

        if (!subs || subs.length === 0) {
            console.log(`[Cron] No subscriptions due for renewal.`);
            return NextResponse.json({ success: true, count: 0 });
        }

        // --- BATCH LIMIT: Max 50 ---
        const totalFound = subs.length;
        const subsToProcess = subs.slice(0, 50);
        console.log(`[Cron] Found ${totalFound} subscriptions due for renewal.`);

        // 3. Extract unique user IDs
        const userIds = [...new Set(subsToProcess.map(s => s.user_id))].filter(Boolean);

        if (userIds.length === 0) {
            console.warn('[Cron] No user_ids extracted.');
            return NextResponse.json({ success: true, count: 0 });
        }

        // 4. Fetch Profiles — only columns that actually exist in the profiles table
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, user_tier')
            .in('id', userIds);

        if (profilesError) {
            console.error('[Cron] Database error (profiles):', profilesError);
            return NextResponse.json({
                success: false,
                error: profilesError.message,
                phase: 'fetch_profiles'
            }, { status: 200 });
        }

        // 5. Map profiles by ID
        const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

        // 6. Send emails with tier-aware limits (quota checked via email_quota_log)
        const sendWithTimeout = (data: any) => Promise.race([
            sendBillReminderEmail(data),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Email Timeout (9s)')), 9000)
            )
        ]);

        const emailPromises = subsToProcess.map(async (sub: any) => {
            const userProfile = profileMap.get(sub.user_id);

            if (!userProfile?.email) {
                console.warn(`[Cron] Skipped ${sub.name} for ${sub.user_id}: no_email`);
                return { id: sub.id, status: 'skipped', reason: 'no_email' };
            }

            // ─── Tier-aware alert limit check via email_quota_log ───
            const userTier = userProfile.user_tier || 'free';
            if (userTier === 'free') {
                const { count, error: quotaError } = await supabaseAdmin
                    .from('email_quota_log')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', sub.user_id)
                    .in('email_type', ['reminder', 'dunning'])
                    .gte('billing_period_start', startOfMonth(new Date()));

                if (quotaError) {
                    console.error(`[Cron] Quota check error for user ${sub.user_id}:`, quotaError);
                }

                if ((count ?? 0) >= 3) {
                    console.warn(`[Cron] Skipped ${sub.name} for ${sub.user_id}: alert_limit_reached`);
                    return { id: sub.id, status: 'skipped', reason: 'alert_limit_reached' };
                }
            }

            try {
                const result = await sendWithTimeout({
                    email: userProfile.email,
                    userName: userProfile.full_name?.split(' ')[0] || 'User',
                    serviceName: sub.name,
                    amount: sub.cost,
                    currency: sub.currency || 'USD',
                    dueDate: formattedDate,
                    category: sub.category,
                    isTrial: sub.is_trial || false,
                    cancellationLink: sub.cancellation_link,
                    userId: sub.user_id,
                }) as any;

                if (result?.error) {
                    console.error(`[Cron] Failed to send to ${userProfile.email}: ${result.error}`);
                    return { id: sub.id, status: 'failed', email: userProfile.email, error: result.error };
                }

                // Log to email_quota_log after successful send
                await supabaseAdmin.from('email_quota_log').insert({
                    user_id: sub.user_id,
                    email_type: 'reminder',
                    sent_at: new Date().toISOString(),
                    billing_period_start: startOfMonth(new Date()),
                });

                console.log(`[Cron] Email sent to ${userProfile.email} for ${sub.name}`);
                return { id: sub.id, status: 'sent', email: userProfile.email };
            } catch (err: any) {
                console.error(`[Cron] Failed to send to ${userProfile.email}: ${err.message}`);
                return { id: sub.id, status: 'failed', email: userProfile.email, error: err.message };
            }
        });

        const results = await Promise.all(emailPromises);

        const sentCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        console.log(`[Cron] Complete. Sent: ${sentCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);

        return NextResponse.json({
            success: true,
            total_found: totalFound,
            processed_count: subsToProcess.length,
            sent_count: sentCount,
            failed_count: failedCount,
            skipped_count: skippedCount,
            results: results
        });

    } catch (err: any) {
        console.error('[Cron] Unexpected crash in route:', err);
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 200 });
    }
}
