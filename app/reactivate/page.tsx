
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { reactivateSubscription } from '@/app/actions/stripe';

export default async function ReactivatePage({
    searchParams
}: {
    searchParams: Promise<{ token?: string }>
}) {
    const supabase = await createClient(); // Await createClient for server component
    const { token } = await searchParams;

    if (!token) {
        redirect('/dashboard?error=invalid_token');
    }

    // Find user by token
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('cancel_reactivation_token', token)
        .single();
    // Removed .eq('cancellation_scheduled', true) to handle cases where it might have been cleared or strictly checking token validity first. 
    // Actually, sticking to USER requested logic plus common sense: if token matches, it's valid.
    // The profile might not have cancellation_scheduled if it was already processed, but let's stick to the core logic.

    if (!profile) {
        redirect('/dashboard?error=expired_token');
    }

    // Check if cancellation is actually scheduled
    if (!profile.cancellation_scheduled) {
        // Already reactivated or not cancelled
        redirect('/dashboard?message=Subscription%20already%20active');
    }

    // Check if expired
    if (profile.cancellation_date && new Date(profile.cancellation_date) < new Date()) {
        redirect('/dashboard?error=expired');
    }

    // Reactivate subscription
    await reactivateSubscription(token);

    redirect('/dashboard?reactivated=true');
}
