import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

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
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as any;
            // We need to find the user by Stripe Customer ID if client_reference_id is not available here.
            // Or we assume we can link back.
            // However, usually we store stripe_customer_id in profiles.
            // For this simplified task, we might not have stripe_customer_id in profiles yet.
            // But commonly metadata contains userId if passed during creation.
            // Let's Check if we can get userId.
            // If not, we might fail to revoke.
            // BUT: The prompt says: "Handle customer.subscription.deleted: Set is_pro = false".
            // We will try to rely on metadata if added, or query by email if possible?
            // Best bet is metadata added during checkout creation? Implicitly done by stripe sometimes if set?
            // Let's wait. The checkout session creation didn't add metadata with userId, just client_reference_id.
            // client_reference_id persists to the subscription? Not always.
            // But we can retrieve the customer and check email?
            // For now, let's look for known identifying info.

            // Attempt 1: Check metadata
            // Attempt 2: Retrieve Subscription via Stripe API to see "expand" fields?
            // Actually, 'customer.subscription.deleted' event object has 'customer' (ID).
            // If we don't store customer ID, we strictly can't link back easily without querying Stripe for the customer email
            // and then querying Supabase for that email.

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
