import { render } from '@react-email/render';
import React from 'react';
import { PlanChangeEmail } from '@/emails/PlanChangeEmail';
import { BillReminderEmail } from '@/emails/BillReminderEmail';
import { PaymentFailed } from './emails/PaymentFailed';
import { createClient } from '@supabase/supabase-js';
import { startOfMonth } from 'date-fns';

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
        const billingPeriodStart = startOfMonth(now).toISOString();

        await supabaseAdmin.from('email_quota_log').insert({
            user_id: userId,
            email_type: emailType,
            sent_at: now.toISOString(),
            billing_period_start: billingPeriodStart
        });
    } catch (err) {
        console.error('[Email] Failed to log email sent event:', err);
        // Do NOT block if logging fails
    }
}

/**
 * Checks if a user has remaining email quota (limit of 3 for free users)
 */
export async function canSendReminderEmail(userId: string, userTier: string): Promise<boolean> {
    // Pro and Lifetime users: always send
    if (userTier !== 'free') return true;

    try {
        const startOfMonthDate = startOfMonth(new Date()).toISOString();

        const { count, error } = await supabaseAdmin
            .from('email_quota_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('email_type', ['reminder', 'dunning'])
            .gte('billing_period_start', startOfMonthDate);

        if (error) throw error;

        return (count ?? 0) < 3;
    } catch (err) {
        console.error('[Email] Failed to check email quota:', err);
        // Default to safe side if check fails? Or allow?
        // Requirement says "allow up to 3", if error we might want to block to be safe or allow.
        // Usually, if quota check fails, we might want to let it through but log it.
        // However, the rule says "Call this check BEFORE sending".
        return false;
    }
}

/**
 * Gets remaining email quota for display
 */
export async function getRemainingEmailQuota(userId: string) {
    try {
        const startOfMonthDate = startOfMonth(new Date()).toISOString();

        const { count, error } = await supabaseAdmin
            .from('email_quota_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('email_type', ['reminder', 'dunning'])
            .gte('billing_period_start', startOfMonthDate);

        if (error) throw error;

        return Math.max(0, 3 - (count || 0));
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
    // Check quota before sending for free users
    const { data: profile } = await supabaseAdmin.from('profiles').select('user_tier').eq('id', userId).single();
    const userTier = profile?.user_tier || 'free';

    const allowed = await canSendReminderEmail(userId, userTier);
    if (!allowed) {
        console.log(`[Email] Quota exhausted for user ${userId} (${userTier}). Skipping reminder for ${serviceName}.`);
        return { success: false, error: 'QUOTA_EXHAUSTED' };
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
