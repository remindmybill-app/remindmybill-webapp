import { Resend } from 'resend';

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
    from = 'Remind My Bill <onboarding@resend.dev>', // Default from address
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
