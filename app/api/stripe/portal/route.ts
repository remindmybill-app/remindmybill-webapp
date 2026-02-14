import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { customerId } = await req.json();

        if (!customerId) {
            return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/settings?tab=billing`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('[Portal] Error creating portal session:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
