import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EmailRequest {
    to: string;
    subject: string;
    type: "welcome" | "reminder" | "receipt";
    data: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { to, subject, type, data }: EmailRequest = await req.json();

        let html = "";
        // Basic templates
        if (type === "welcome") {
            html = `
        <h1>Welcome to Remind My Bill!</h1>
        <p>Hi there,</p>
        <p>Thanks for joining Remind My Bill. We're excited to help you manage your subscriptions.</p>
        <p>Start by adding your first subscription in the dashboard.</p>
      `;
        } else if (type === "reminder") {
            html = `
            <h1>Bill Reminder</h1>
            <p>Your subscription for <strong>${data.serviceName}</strong> is renewing soon.</p>
            <p>Amount: ${data.amount}</p>
            <p>Date: ${data.date}</p>
        `
        } else {
            html = `<p>${JSON.stringify(data)}</p>`
        }

        const { data: emailData, error } = await resend.emails.send({
            from: "Remind My Bill <onboarding@resend.dev>", // TODO: Update with verified domain
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("Resend Error:", error)
            return new Response(JSON.stringify({ error: error }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(emailData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Server Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

serve(handler);
