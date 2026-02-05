
import { createClient } from '@/lib/supabase-server'; // Note: Ensure this exists or use check
import { sendBillReminderEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

// This route should be called by Vercel Cron
export async function GET() {
    try {
        // 0. Configuration check
        if (!process.env.RESEND_API_KEY) {
            console.error('[Cron] Missing RESEND_API_KEY');
            return NextResponse.json({ success: false, error: 'Configuration error: Missing API Key' }, { status: 200 });
        }

        const supabase = await createClient();

        // 1. Calculate target date: Today + 3 Days
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 3);
        const formattedDate = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log(`[Cron] Starting LIVE processing. Target date: ${formattedDate}`);

        // 2. Query Subscriptions (Step 1: Fetch valid subscriptions)
        console.time('DB_Fetch_Subscriptions');
        const { data: subs, error: subsError } = await supabase
            .from('subscriptions')
            .select('*, user_id')
            .eq('renewal_date', formattedDate)
            .eq('status', 'active');
        console.timeEnd('DB_Fetch_Subscriptions');

        if (subsError) {
            console.error('[Cron] Database error (subscriptions):', subsError);
            return NextResponse.json({
                success: false,
                error: subsError.message,
                phase: 'fetch_subscriptions'
            }, { status: 200 }); // Returning 200 to prevent Cloudflare retries
        }

        if (!subs || subs.length === 0) {
            console.log('[Cron] No subscriptions found for renewal in 3 days.');
            return NextResponse.json({ success: true, count: 0 });
        }

        // --- BATCH LIMIT: Max 50 ---
        const totalFound = subs.length;
        const subsToProcess = subs.slice(0, 50);
        console.log(`[Cron] Found ${totalFound} subscriptions. Processing first ${subsToProcess.length}.`);

        // 3. Extract unique user IDs (Step 2: Prepare profile query)
        const userIds = [...new Set(subsToProcess.map(s => s.user_id))].filter(Boolean);

        if (userIds.length === 0) {
            console.warn('[Cron] No user_ids extracted.');
            return NextResponse.json({ success: true, count: 0 });
        }

        // 4. Fetch Profiles (Step 3: Fetch profiles for those users)
        console.time('DB_Fetch_Profiles');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
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

        // 5. Map them together (Step 4: Memory Mapping)
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        console.log(`[Cron] Loaded ${profiles?.length} profiles.`);

        // 6. Action: Parallel Email Sending (Step 5: LIVE Execution)
        console.time('Email_Phase_Parallel');

        const emailPromises = subsToProcess.map(async (sub) => {
            const userProfile = profileMap.get(sub.user_id);

            if (!userProfile?.email) {
                console.warn(`[Cron] Skipping ${sub.id} - No email for user ${sub.user_id}.`);
                return { id: sub.id, status: 'skipped', reason: 'no_email' };
            }

            try {
                // Actual email send
                const { error: emailError } = await sendBillReminderEmail({
                    email: userProfile.email,
                    userName: userProfile.full_name?.split(' ')[0] || 'User',
                    serviceName: sub.name,
                    amount: sub.cost,
                    currency: sub.currency || 'USD',
                    dueDate: formattedDate,
                    category: sub.category,
                    isTrial: sub.is_trial || false,
                    cancellationLink: sub.cancellation_link,
                });

                if (emailError) {
                    console.error(`[Cron] Failed send to ${userProfile.email} for ${sub.id}:`, emailError);
                    return { id: sub.id, status: 'failed', email: userProfile.email, error: emailError };
                }

                return { id: sub.id, status: 'sent', email: userProfile.email };
            } catch (err: any) {
                console.error(`[Cron] Unexpected error sending to ${userProfile.email}:`, err);
                return { id: sub.id, status: 'failed', email: userProfile.email, error: err.message };
            }
        });

        const results = await Promise.all(emailPromises);
        console.timeEnd('Email_Phase_Parallel');

        const sentCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`[Cron] LIVE Process complete. Sent: ${sentCount}, Failed: ${failedCount}.`);

        return NextResponse.json({
            success: true,
            total_found: totalFound,
            processed_count: subsToProcess.length,
            sent_count: sentCount,
            failed_count: failedCount
        });

    } catch (err: any) {
        console.error('[Cron] Unexpected crash in route:', err);
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 200 });
    }
}
