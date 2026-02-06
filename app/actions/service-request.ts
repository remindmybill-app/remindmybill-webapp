'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function submitServiceRequest(serviceName: string) {
    // Validate input
    if (!serviceName || serviceName.trim().length < 2) {
        return { success: false, error: 'Service name must be at least 2 characters.' };
    }

    // Get user session from cookies
    const cookieStore = await cookies();
    const supabase = getSupabaseBrowserClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: 'You must be logged in to submit a request.' };
    }

    try {
        const { error } = await supabaseAdmin
            .from('service_requests')
            .insert({
                user_id: user.id,
                service_name: serviceName.trim(),
                status: 'pending',
            });

        if (error) {
            console.error('Error inserting service request:', error);
            return { success: false, error: 'Failed to submit request.' };
        }

        return { success: true };
    } catch (err) {
        console.error('Service request submission error:', err);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
