import { getSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { name, email, subject, message, userTier } = await req.json();
        const supabase = await getSupabaseServerClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Save to database
        const { data: submission } = await supabase
            .from('contact_submissions')
            .insert({
                user_id: user.id,
                name,
                email,
                subject,
                message,
                user_tier: userTier,
                status: 'new'
            })
            .select()
            .single();

        // Send notification email to support team
        await resend.emails.send({
            from: 'RemindMyBill Support <support@remindmybill.com>',
            to: 'support@remindmybill.com', // Your support inbox
            replyTo: email,
            subject: `[Contact Form] ${subject} - ${userTier.toUpperCase()}`,
            html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Tier:</strong> ${userTier}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Submission ID: ${submission.id}</small></p>
      `
        });

        // Send confirmation email to user
        await resend.emails.send({
            from: 'RemindMyBill <no-reply@remindmybill.com>',
            to: email,
            subject: 'We received your message',
            html: `
        <p>Hi ${name},</p>
        <p>Thank you for contacting RemindMyBill. We've received your message and will respond within 24 hours.</p>
        <p><strong>Your message:</strong></p>
        <p style="background: #f5f5f5; padding: 16px; border-radius: 8px;">${message.replace(/\n/g, '<br>')}</p>
        <p>Best regards,<br>The RemindMyBill Team</p>
      `
        });

        return NextResponse.json({ success: true, id: submission.id });
    } catch (error) {
        console.error('Contact submission error:', error);
        return NextResponse.json(
            { error: 'Failed to submit message' },
            { status: 500 }
        );
    }
}
