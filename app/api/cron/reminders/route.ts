import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sendBillReminderEmail } from '@/lib/email';
import { geminiFlash as model } from '@/lib/gemini';

async function getAICancellationAdvice(serviceName: string): Promise<string> {
    const fallback = "To cancel, visit the merchant's website at least 24 hours in advance.";
    try {
        const prompt = `Provide a 2-sentence summary on how to cancel '${serviceName}'. Include a direct link to their cancellation page if known, or a tip on potential hidden fees. Keep it urgent and helpful.`;

        // Setting a timeout for AI generation
        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error('AI Timeout')), 8000))
        ]) as any;

        const response = await result.response;
        const text = response.text().trim();
        return text || fallback;
    } catch (error) {
        console.error(`FULL AI ERROR (Cron ${serviceName}):`, error);
        return fallback;
    }
}

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

                // Get AI powered advice
                const advice = await getAICancellationAdvice(sub.name);

                return await sendBillReminderEmail({
                    email: sub.profiles.email,
                    userName,
                    serviceName: sub.name,
                    amount: sub.cost,
                    currency: sub.currency,
                    dueDate: new Date(sub.renewal_date).toLocaleDateString(),
                    cancellationAdvice: advice
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
