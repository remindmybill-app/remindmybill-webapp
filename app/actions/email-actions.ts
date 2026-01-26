'use server';

import { sendEmail } from '@/lib/email';
import { RenewalReminderEmail } from '@/emails/RenewalReminderEmail';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import React from 'react';

export async function sendReminderEmail(subscriptionId: string) {
    try {
        const supabase = await getSupabaseServerClient();

        // 1. Fetch Subscription Data
        const { data: sub, error: subError } = await supabase
            .from('subscriptions')
            .select('*, profiles(full_name, email)')
            .eq('id', subscriptionId)
            .single();

        if (subError || !sub) {
            console.error('Error fetching subscription for email:', subError);
            return { success: false, error: 'Subscription not found' };
        }

        const customerName = sub.profiles?.full_name?.split(' ')[0] || 'valued customer';
        const email = sub.profiles?.email;

        if (!email) {
            return { success: false, error: 'User email not found' };
        }

        // 2. Prepare Template Props
        const amount = sub.cost;
        const currency = sub.currency;
        const serviceName = sub.name;
        const dueDate = new Date(sub.renewal_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

        // 3. Send Email
        const result = await sendEmail({
            to: email,
            subject: `Reminder: Your ${serviceName} bill is due on ${dueDate}`,
            react: React.createElement(RenewalReminderEmail, {
                customerName,
                serviceName,
                amount,
                currency,
                dueDate,
            }),
        });

        return result;
    } catch (error) {
        console.error('Action failure in sendReminderEmail:', error);
        return { success: false, error };
    }
}
