
import { createClient } from '@/lib/supabase-server'; // Note: Ensure this exists or use check
import { sendBillReminderEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

// This route should be called by Vercel Cron
export async function GET() {
    try {
        const supabase = await createClient();

        // 1. Calculate target date: Today + 3 Days
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 3);
        const formattedDate = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log(`[Cron DEBUG] Starting dry run. Checking date: ${formattedDate}`);

        // 2. Query Subscriptions (Step 1: Fetch valid subscriptions)
        console.time('DB_Fetch_Subscriptions');
        const { data: subs, error: subsError } = await supabase
            .from('subscriptions')
            .select('*, user_id')
            .eq('renewal_date', formattedDate)
            .eq('status', 'active');
        console.timeEnd('DB_Fetch_Subscriptions');

        if (subsError) {
            console.error('[Cron DEBUG] Database error (subscriptions):', subsError);
            return NextResponse.json({
                success: false,
                error: subsError.message,
                phase: 'fetch_subscriptions'
            }, { status: 200 });
        }

        if (!subs || subs.length === 0) {
            console.log('[Cron DEBUG] No subscriptions found for renewal in 3 days.');
            return NextResponse.json({ success: true, count: 0, mode: 'dry_run' });
        }

        // --- BATCH LIMIT: Max 50 (Dry Run still obeys this) ---
        const totalFound = subs.length;
        const subsToProcess = subs.slice(0, 50);
        console.log(`[Cron DEBUG] Found ${totalFound} subscriptions. Dry-running first ${subsToProcess.length}.`);

        // 3. Extract unique user IDs (Step 2: Prepare profile query)
        const userIds = [...new Set(subsToProcess.map(s => s.user_id))].filter(Boolean);

        if (userIds.length === 0) {
            console.warn('[Cron DEBUG] No user_ids extracted.');
            return NextResponse.json({ success: true, count: 0, mode: 'dry_run' });
        }

        // 4. Fetch Profiles (Step 3: Fetch profiles for those users)
        console.time('DB_Fetch_Profiles');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
        console.timeEnd('DB_Fetch_Profiles');

        if (profilesError) {
            console.error('[Cron DEBUG] Database error (profiles):', profilesError);
            return NextResponse.json({
                success: false,
                error: profilesError.message,
                phase: 'fetch_profiles'
            }, { status: 200 });
        }

        // 5. Map them together (Step 4: Memory Mapping)
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        console.log(`[Cron DEBUG] Loaded ${profiles?.length} profiles.`);

        // 6. DEBUG: Dry Run loop (No actual emails sent)
        console.time('Dry_Run_Execution');

        const dryRunResults = subsToProcess.map((sub) => {
            const userProfile = profileMap.get(sub.user_id);

            if (!userProfile?.email) {
                console.warn(`[Cron DEBUG] Missing email for user ${sub.user_id}.`);
                return { id: sub.id, status: 'skipped', reason: 'no_email' };
            }

            console.log(`[Cron DEBUG] [DRY RUN] Would have sent email to: ${userProfile.email} for ${sub.name}`);

            return {
                id: sub.id,
                status: 'dry_run_success',
                target: userProfile.email,
                userName: userProfile.full_name,
                serviceName: sub.name,
                amount: sub.cost
            };
        });

        console.timeEnd('Dry_Run_Execution');

        return NextResponse.json({
            success: true,
            mode: 'dry_run',
            total_found: totalFound,
            processed_count: subsToProcess.length,
            date: formattedDate,
            results: dryRunResults
        });

    } catch (err: any) {
        console.error('[Cron DEBUG] Unexpected crash:', err);
        return NextResponse.json({
            success: false,
            error: err.message,
            mode: 'dry_run'
        }, { status: 200 });
    }
}
