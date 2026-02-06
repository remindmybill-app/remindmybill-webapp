import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { sendPlanChangeEmail } from '@/lib/email';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// We need a service role client to update user profiles without their session
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const headersList = await headers();
        const signature = headersList.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
        }

        let event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any;
            const userId = session.client_reference_id;

            if (userId) {
                console.log(`Updating user ${userId} to PRO`);
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({ is_pro: true, subscription_tier: 'pro' }) // Also update string tier if used
                    .eq('id', userId);

                if (error) {
                    console.error('Error updating profile to PRO:', error);
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
                }

                // Send Welcome Email
                try {
                    // Try to get user details for the email
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('full_name, email')
                        .eq('id', userId)
                        .single();

                    const email = session.customer_email || session.customer_details?.email || profile?.email;

                    if (email) {
                        await sendPlanChangeEmail({
                            email,
                            userName: profile?.full_name || 'Valued Customer',
                            planName: 'Pro Plan',
                            price: '$3.99', // Or dynamic if permissible
                            limit: 9999, // Unlimited
                            type: 'upgrade',
                            date: new Date().toLocaleDateString(),
                        });
                        console.log(`Sent upgrade email to ${email}`);
                    }
                } catch (emailError) {
                    console.error('Failed to send upgrade email:', emailError);
                }
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as any;
            const customerId = subscription.customer;

            try {
                const customer = await stripe.customers.retrieve(customerId as string);
                if (!('deleted' in customer) && customer.email) {
                    const { error } = await supabaseAdmin
                        .from('profiles')
                        .update({ is_pro: false, subscription_tier: 'free' })
                        .eq('email', customer.email);

                    if (error) {
                        console.error('Error updating profile to FREE via email lookup:', error);
                    } else {
                        console.log(`Downgraded user with email ${customer.email} to FREE`);

                        // Send Downgrade Email
                        try {
                            await sendPlanChangeEmail({
                                email: customer.email,
                                userName: (customer.name) || 'Valued Customer',
                                planName: 'Free Plan',
                                price: '$0.00',
                                limit: 3,
                                type: 'downgrade',
                                date: new Date().toLocaleDateString(),
                            });
                            console.log(`Sent downgrade email to ${customer.email}`);
                        } catch (emailErr) {
                            console.error('Failed to send downgrade email:', emailErr);
                        }
                    }
                }
            } catch (err) {
                console.error('Error retrieving customer for downgrade:', err);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Webhook handler failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
