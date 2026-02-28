import { render } from '@react-email/render';
import React from 'react';
import { PlanChangeEmail } from '@/emails/PlanChangeEmail';
import { BillReminderEmail } from '@/emails/BillReminderEmail';
import { PaymentFailed } from './emails/PaymentFailed';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client for logging and quota checks
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type EmailType = 'reminder' | 'dunning' | 'downgrade' | 'system';

interface SendEmailOptions {
    to: string | string[];
    subject: string;
    react: React.ReactElement;
    text?: string;
    from?: string;
    userId?: string; // Optional but recommended for tracking
    emailType?: EmailType;
}

/**
 * Logs an email sent event to the database
 */
async function logEmailSent(userId: string, emailType: EmailType) {
    try {
        const now = new Date();
        const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        await supabaseAdmin.from('email_quota_log').insert({
            user_id: userId,
            email_type: emailType,
            billing_period_start: billingPeriodStart,
            sent_at: now.toISOString()
        });
    } catch (err) {
        console.error('[Email] Failed to log email sent event:', err);
    }
}

/**
 * Checks if a user has remaining email quota
 */
export async function getRemainingEmailQuota(userId: string) {
    try {
        const now = new Date();
        const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        const { data, error } = await supabaseAdmin
            .from('email_quota_log')
            .select('email_type')
            .eq('user_id', userId)
            .eq('billing_period_start', billingPeriodStart)
            .in('email_type', ['reminder', 'dunning']);

        if (error) throw error;

        const count = data?.length || 0;
        return Math.max(0, 3 - count);
    } catch (err) {
        console.error('[Email] Failed to check email quota:', err);
        return 0;
    }
}

export async function sendEmail({
    to,
    subject,
    react,
    text,
    from = 'RemindMyBill Alerts <alerts@remindmybill.com>',
    userId,
    emailType,
}: SendEmailOptions) {
    console.log("[Email] Attempting to send. Type:", emailType, "User:", userId);

    try {
        const html = await render(react);

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                text: text || ''
            })
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Resend Raw Error:", err);
            throw new Error(`Resend Failed: ${res.status} ${err}`);
        }

        const data = await res.json();
        console.log("[Email] Resend Success:", data);

        // Log the email if userId and emailType are provided
        if (userId && emailType) {
            await logEmailSent(userId, emailType);
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

export async function sendPlanChangeEmail({
    email,
    userName,
    planName,
    price,
    limit,
    type,
    date,
    userId,
}: {
    email: string;
    userName: string;
    planName: string;
    price: string;
    limit: number;
    type: 'upgrade' | 'downgrade';
    date: string;
    userId?: string;
}) {
    const subject = type === 'upgrade'
        ? `Welcome to ${planName}! 🚀`
        : 'Your RemindMyBill Plan has been updated';

    return sendEmail({
        to: email,
        subject,
        react: React.createElement(PlanChangeEmail, {
            customerName: userName,
            newPlanName: planName,
            price,
            limit,
            type,
            date,
        }),
        userId,
        emailType: type === 'downgrade' ? 'downgrade' : 'system'
    });
}

export async function sendBillReminderEmail({
    email,
    userName,
    serviceName,
    amount,
    currency,
    dueDate,
    category,
    isTrial,
    cancellationLink,
    userId,
}: {
    email: string;
    userName: string;
    serviceName: string;
    amount: number;
    currency: string;
    dueDate: string;
    category?: string;
    isTrial?: boolean;
    cancellationLink?: string;
    userId: string;
}) {
    // Check quota before sending for free users (handled by caller usually, but final check here)
    const { data: profile } = await supabaseAdmin.from('profiles').select('user_tier').eq('id', userId).single();

    if (profile?.user_tier === 'free') {
        const remaining = await getRemainingEmailQuota(userId);
        if (remaining <= 0) {
            console.log(`[Email] Quota exhausted for user ${userId}. Skipping reminder for ${serviceName}.`);
            return { success: false, error: 'QUOTA_EXHAUSTED' };
        }
    }

    return sendEmail({
        to: email,
        subject: `Heads up! ${serviceName} renews in 3 days`,
        react: React.createElement(BillReminderEmail, {
            customerName: userName,
            serviceName,
            amount,
            currency,
            dueDate,
            category,
            isTrial,
            cancellationLink,
        }),
        userId,
        emailType: 'reminder'
    });
}

export async function sendPaymentFailedEmail({
    email,
    userName,
    attemptCount,
    cardBrand,
    cardLast4,
    amount,
    hostedInvoiceUrl,
    userId,
}: {
    email: string;
    userName: string;
    attemptCount: number;
    cardBrand: string;
    cardLast4: string;
    amount: number;
    hostedInvoiceUrl: string;
    userId?: string;
}) {
    let subject = "Payment unsuccessful – Action required";
    if (attemptCount === 2) {
        subject = "2nd attempt failed – Please update your card";
    } else if (attemptCount >= 3) {
        subject = "Final notice – Your Pro access will be paused";
    }

    return sendEmail({
        to: email,
        subject,
        react: React.createElement(PaymentFailed, {
            userName,
            attemptCount,
            cardBrand,
            cardLast4,
            amount,
            hostedInvoiceUrl: hostedInvoiceUrl || '',
        }),
        userId,
        emailType: 'dunning'
    });
}
