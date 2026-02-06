'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for bypassing RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function submitServiceRequest(serviceName: string) {
    // Validate input
    if (!serviceName || serviceName.trim().length < 2) {
        return { success: false, error: 'Service name must be at least 2 characters.' };
    }

    try {
        // Create a server client to get the user session
        const cookieStore = await cookies();
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('Auth error:', userError);
            return { success: false, error: 'You must be logged in to submit a request.' };
        }

        // Use admin client to insert (bypasses RLS)
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

