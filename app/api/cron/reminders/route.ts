import { createClient } from '@supabase/supabase-js';
import { sendBillReminderEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// This route should be called by Vercel Cron
export async function GET() {
    try {
        // 0. Configuration check & Logging
        const hasResendKey = !!process.env.RESEND_API_KEY;
        const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        console.log(`[Cron DEBUG] Starting Fail-Fast logic. RESEND: ${hasResendKey}, ADMIN_KEY: ${hasServiceKey}`);

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

        console.log(`[Cron] Target date: ${formattedDate}`);

        // 2. Query Subscriptions
        console.log(`[Cron] Searching for renewal_date MATCHING: ${formattedDate}`);

        console.time('DB_Fetch_Subscriptions');
        const { data: subs, error: subsError } = await supabaseAdmin
            .from('subscriptions')
            .select('*, user_id')
            .eq('renewal_date', formattedDate)
            .eq('status', 'active')
            .eq('is_locked', false);
        console.timeEnd('DB_Fetch_Subscriptions');

        if (subsError) {
            console.error('[Cron] Database error (subscriptions):', subsError);
            return NextResponse.json({
                success: false,
                error: subsError.message,
                phase: 'fetch_subscriptions'
            }, { status: 200 });
        }

        if (!subs || subs.length === 0) {
            console.log('[Cron] No subscriptions found for renewal in 3 days.');
            return NextResponse.json({ success: true, count: 0 });
        }

        // --- BATCH LIMIT: Max 50 ---
        const totalFound = subs.length;
        const subsToProcess = subs.slice(0, 50);
        console.log(`[Cron] Found ${totalFound} subscriptions. Processing first ${subsToProcess.length}.`);

        // 3. Extract unique user IDs
        const userIds = [...new Set(subsToProcess.map(s => s.user_id))].filter(Boolean);

        if (userIds.length === 0) {
            console.warn('[Cron] No user_ids extracted.');
            return NextResponse.json({ success: true, count: 0 });
        }

        // 4. Fetch Profiles WITH tier info for alert limit checking
        console.time('DB_Fetch_Profiles');
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, user_tier, email_alerts_used, email_alerts_limit')
            .in('id', userIds);
        console.timeEnd('DB_Fetch_Profiles');

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
        console.log(`[Cron] Loaded ${profiles?.length} profiles.`);

        // 6. Send emails with tier-aware limits
        console.time('Email_Phase_FailFast');

        const sendWithTimeout = (data: any) => Promise.race([
            sendBillReminderEmail(data),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Email Timeout (9s)')), 9000)
            )
        ]);

        const emailPromises = subsToProcess.map(async (sub: any) => {
            const userProfile = profileMap.get(sub.user_id);

            if (!userProfile?.email) {
                console.warn(`[Cron] Skipping ${sub.id} - No email for user ${sub.user_id}.`);
                return { id: sub.id, status: 'skipped', reason: 'no_email' };
            }

            // ─── Tier-aware alert limit check ───
            const userTier = userProfile.user_tier || 'free';
            if (userTier === 'free') {
                const alertsUsed = userProfile.email_alerts_used ?? 0;
                const alertsLimit = userProfile.email_alerts_limit ?? 3;

                if (alertsUsed >= alertsLimit) {
                    console.log(`[Cron] Skipping ${sub.id} - Free user ${sub.user_id} alert limit reached (${alertsUsed}/${alertsLimit}).`);
                    return { id: sub.id, status: 'skipped', reason: 'alert_limit_reached' };
                }
            }

            try {
                const { error: emailError } = await sendWithTimeout({
                    email: userProfile.email,
                    userName: userProfile.full_name?.split(' ')[0] || 'User',
                    serviceName: sub.name,
                    amount: sub.cost,
                    currency: sub.currency || 'USD',
                    dueDate: formattedDate,
                    category: sub.category,
                    isTrial: sub.is_trial || false,
                    cancellationLink: sub.cancellation_link,
                }) as any;

                if (emailError) {
                    console.error(`[Cron] Failed send to ${userProfile.email}:`, emailError);
                    return { id: sub.id, status: 'failed', email: userProfile.email, error: emailError };
                }

                // Increment alert counter for free tier users
                if (userTier === 'free') {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ email_alerts_used: (userProfile.email_alerts_used ?? 0) + 1 })
                        .eq('id', sub.user_id);
                }

                return { id: sub.id, status: 'sent', email: userProfile.email };
            } catch (err: any) {
                console.error(`[Cron] Error (Timeout or Exception) for ${userProfile.email}:`, err.message);
                return { id: sub.id, status: 'failed', email: userProfile.email, error: err.message };
            }
        });

        const results = await Promise.all(emailPromises);
        console.timeEnd('Email_Phase_FailFast');

        const sentCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;

        console.log(`[Cron] FAIL FAST complete. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}.`);

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
