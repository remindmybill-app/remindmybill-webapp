
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

        console.log(`[Cron] Checking for subscriptions renewing on: ${formattedDate}`);

        // 2. Query Subscriptions (Step 1: Fetch valid subscriptions)
        const { data: subs, error: subsError } = await supabase
            .from('subscriptions')
            .select('*, user_id')
            .eq('renewal_date', formattedDate)
            .eq('status', 'active');

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

        // 3. Extract unique user IDs (Step 2: Prepare profile query)
        const userIds = [...new Set(subs.map(s => s.user_id))].filter(Boolean);

        if (userIds.length === 0) {
            console.warn('[Cron] Subscriptions found but no user_ids extracted.');
            return NextResponse.json({ success: true, count: 0 });
        }

        // 4. Fetch Profiles (Step 3: Fetch profiles for those users)
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);

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

        console.log(`[Cron] Found ${subs.length} subscriptions and ${profiles?.length} profiles.`);

        // 6. Loop & Send Emails
        let sentCount = 0;
        const results = [];

        for (const sub of subs) {
            const userProfile = profileMap.get(sub.user_id);

            if (!userProfile?.email) {
                console.warn(`[Cron] Skipping sub ${sub.id} - No email found for user ${sub.user_id}.`);
                continue;
            }

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
                console.error(`[Cron] Failed to send email for ${sub.id}:`, emailError);
                results.push({ id: sub.id, status: 'failed', error: emailError });
            } else {
                sentCount++;
                results.push({ id: sub.id, status: 'sent' });
            }
        }

        console.log(`[Cron] Process complete. Sent ${sentCount} emails.`);

        return NextResponse.json({
            success: true,
            count: sentCount,
            date: formattedDate
        });

    } catch (err: any) {
        console.error('[Cron] Unexpected error:', err);
        // Returning 200 to prevent Cloudflare retries hammering the server during a crash
        return NextResponse.json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 200 });
    }
}
