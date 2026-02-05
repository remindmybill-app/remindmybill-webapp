import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { PlanChangeEmail } from '@/emails/PlanChangeEmail';
import { BillReminderEmail } from '@/emails/BillReminderEmail';

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
    from = 'Remind My Bill <updates@remindmybill.com>',
}: SendEmailOptions) {
    console.log("[Email] Attempting to send via Raw Fetch. Key configured:", !!process.env.RESEND_API_KEY);

    try {
        const html = renderToStaticMarkup(react);

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from,
                to: [to], // Resend API expects an array for 'to' strings, or single string. SDK handles normalization. Raw API safer with array if unsure.
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
    category,
    isTrial,
    cancellationLink,
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
}) {
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
    });
}
