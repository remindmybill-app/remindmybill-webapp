import { Resend } from 'resend';
import React from 'react';
import { PlanChangeEmail } from '@/emails/PlanChangeEmail';
import { BillReminderEmail } from '@/emails/BillReminderEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
    to: string | string[];
    subject: string;
    react: React.ReactElement;
    text?: string;
    from?: string;
}

export async function sendEmail({
    to,
    subject,
    react,
    text,
    from = 'Remind My Bill <updates@remindmybill.com>', // User asked for this domain
}: SendEmailOptions) {
    try {
        const data = await resend.emails.send({
            from,
            to,
            subject,
            react,
            text: text || '',
        });

        return { success: true, data };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}

export async function sendPlanChangeEmail({
    email,
    userName,
    planName,
    price,
    limit,
    isUpgrade,
    date,
}: {
    email: string;
    userName: string;
    planName: string;
    price: string;
    limit: number;
    isUpgrade: boolean;
    date: string;
}) {
    return sendEmail({
        to: email,
        subject: isUpgrade ? `Welcome to ${planName}! 🚀` : 'Your RemindMyBill Plan has been updated',
        react: React.createElement(PlanChangeEmail, {
            customerName: userName,
            newPlanName: planName,
            price: price,
            limit,
            isUpgrade,
            date,
        }),
    });
}

export async function sendBillReminderEmail({
    email,
    userName,
    serviceName,
    amount,
    currency,
    dueDate,
    cancellationAdvice,
}: {
    email: string;
    userName: string;
    serviceName: string;
    amount: number;
    currency: string;
    dueDate: string;
    cancellationAdvice?: string;
}) {
    return sendEmail({
        to: email,
        subject: `Reminder: Your ${serviceName} bill is due in 3 days`,
        react: React.createElement(BillReminderEmail, {
            customerName: userName,
            serviceName,
            amount,
            currency,
            dueDate,
            cancellationAdvice,
        }),
    });
}
