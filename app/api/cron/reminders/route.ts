import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sendBillReminderEmail } from '@/lib/email';

export async function GET() {
    try {
        console.log('[Cron] Starting Bill Reminder Job...');
        const supabase = await createClient();

        // 1. Calculate the target date (3 days from now)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3);
        const targetDateString = targetDate.toISOString().split('T')[0];

        console.log(`[Cron] Target renewal date: ${targetDateString}`);

        // 2. Query subscriptions due on that date
        // Note: renewal_date is assumed to be a DATE or ISO string in Supabase
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                profiles (
                    email,
                    full_name
                )
            `)
            .eq('renewal_date', targetDateString)
            .eq('status', 'active');

        if (error) {
            console.error('[Cron] Database query error:', error);
            throw error;
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log('[Cron] No subscriptions due for renewal in 3 days.');
            return NextResponse.json({ success: true, message: 'No reminders to send.' });
        }

        console.log(`[Cron] Found ${subscriptions.length} subscriptions to remind.`);

        // 3. Send emails
        const results = await Promise.allSettled(
            subscriptions.map(async (sub: any) => {
                if (!sub.profiles?.email) {
                    return { success: false, error: 'No user email found' };
                }

                const userName = sub.profiles.full_name?.split(' ')[0] || 'User';

                return await sendBillReminderEmail({
                    email: sub.profiles.email,
                    userName,
                    serviceName: sub.name,
                    amount: sub.cost,
                    currency: sub.currency,
                    dueDate: new Date(sub.renewal_date).toLocaleDateString(),
                });
            })
        );

        const summary = {
            total: subscriptions.length,
            sent: results.filter((r: any) => r.status === 'fulfilled' && r.value?.success).length,
            failed: results.filter((r: any) => r.status === 'rejected' || !r.value?.success).length,
        };

        console.log('[Cron] Job complete:', summary);

        return NextResponse.json({ success: true, summary });
    } catch (error: any) {
        console.error('[Cron] Job failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
