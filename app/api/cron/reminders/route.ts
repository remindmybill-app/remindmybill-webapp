
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

        // 2. Query Subscriptions
        // We use !inner on profiles to ensure we only get subscriptions where we can actually email the user
        const { data: subs, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                profiles!inner (
                    email,
                    full_name
                )
            `)
            .eq('renewal_date', formattedDate)
            .eq('status', 'active');

        if (error) {
            console.error('[Cron] Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!subs || subs.length === 0) {
            console.log('[Cron] No subscriptions found for renewal in 3 days.');
            return NextResponse.json({ success: true, count: 0 });
        }

        console.log(`[Cron] Found ${subs.length} subscriptions to remind.`);

        // 3. Loop & Send Emails
        let sentCount = 0;
        const results = [];

        for (const sub of subs) {
            // @ts-ignore - Supabase types might imply array or object, strictly typing 'profiles' is tricky without generated types
            const userProfile = sub.profiles;

            if (!userProfile?.email) {
                console.warn(`[Cron] Skipping sub ${sub.id} - No email found.`);
                continue;
            }

            const { error: emailError } = await sendBillReminderEmail({
                email: userProfile.email,
                userName: userProfile.full_name?.split(' ')[0] || 'User',
                serviceName: sub.name,
                amount: sub.cost,
                currency: sub.currency || 'USD',
                dueDate: formattedDate, // Or sub.renewal_date if we want exact string
                category: sub.category,
                isTrial: sub.is_trial || false, // Assuming is_trial column exists based on context, default to false
                cancellationLink: sub.cancellation_link, // Assuming column exists
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
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
