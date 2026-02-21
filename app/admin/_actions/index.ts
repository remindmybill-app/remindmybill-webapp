'use server';

import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';

// ─── USER ACTIONS ───────────────────────────────────────────

export async function overrideTier(userId: string, tier: string) {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('profiles')
        .update({ user_tier: tier })
        .eq('id', userId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/users');
    return { message: `Tier updated to ${tier}` };
}

export async function toggleSuspend(userId: string, suspend: boolean) {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: suspend })
        .eq('id', userId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/users');
    return { message: suspend ? 'User suspended' : 'User unsuspended' };
}

export async function resendEmail(
    userId: string,
    type: 'welcome' | 'reminder'
) {
    await requireAdmin();

    // Placeholder for email provider integration
    console.log(`[Admin] Sending ${type} email to user ${userId}`);

    return { message: `${type} email queued` };
}

// ─── TRUST CENTER ACTIONS ───────────────────────────────────

export async function approveServiceRequest(requestId: string) {
    await requireAdmin();
    const supabase = createAdminClient();

    // Fetch the service request
    const { data: request, error: fetchError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) throw new Error('Request not found');

    // Insert into service_benchmarks
    const { error: insertError } = await supabase
        .from('service_benchmarks')
        .insert({
            name: request.name || request.service_name,
            category: request.category,
            avg_cost: request.avg_cost || request.suggested_cost,
        });

    if (insertError) throw new Error(insertError.message);

    // Delete the request
    const { error: deleteError } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId);

    if (deleteError) throw new Error(deleteError.message);

    revalidatePath('/admin/trust-center');
    return { message: 'Service request approved and added to benchmarks' };
}

export async function dismissServiceRequest(requestId: string) {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', requestId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/trust-center');
    return { message: 'Service request dismissed' };
}

export async function upsertBenchmark(
    id: string | null,
    data: { name: string; category: string; avg_cost: number }
) {
    await requireAdmin();
    const supabase = createAdminClient();

    if (id) {
        const { error } = await supabase
            .from('service_benchmarks')
            .update(data)
            .eq('id', id);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('service_benchmarks').insert(data);
        if (error) throw new Error(error.message);
    }

    revalidatePath('/admin/trust-center');
    return { message: id ? 'Benchmark updated' : 'Benchmark created' };
}

export async function deleteBenchmark(id: string) {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('service_benchmarks')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/trust-center');
    return { message: 'Benchmark deleted' };
}

// ─── SUPPORT ACTIONS ────────────────────────────────────────

export async function updateSupportTicket(
    id: string,
    fields: { admin_notes?: string; status?: string }
) {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('contact_submissions')
        .update(fields)
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/admin/support');
    return { message: 'Ticket updated' };
}

// ─── BILLING ACTIONS ────────────────────────────────────────

export async function retryInvoice(invoiceId: string) {
    await requireAdmin();

    try {
        const invoice = await stripe.invoices.pay(invoiceId);
        return { success: true, status: invoice.status, message: 'Invoice charged' };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: message, message: `Failed: ${message}` };
    }
}

// ─── CRON ACTIONS ───────────────────────────────────────────

export async function triggerCronJob(jobName: string) {
    await requireAdmin();
    const supabase = createAdminClient();

    try {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            ? new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
            : new URL('http://localhost:3000');

        const response = await fetch(`${baseUrl.origin}/api/cron/${jobName}`, {
            method: 'POST',
            headers: {
                'x-cron-secret': process.env.CRON_SECRET!,
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json().catch(() => ({ message: response.statusText }));
        const status = response.ok ? 'success' : 'error';
        const resultMessage = result.message || result.error || response.statusText;

        // Log to cron_logs
        await supabase
            .from('cron_logs')
            .insert({
                job_name: jobName,
                last_run: new Date().toISOString(),
                status,
                result: resultMessage,
            });

        return { success: response.ok, message: resultMessage };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        await supabase
            .from('cron_logs')
            .insert({
                job_name: jobName,
                last_run: new Date().toISOString(),
                status: 'error',
                result: message,
            });

        return { success: false, message };
    }
}
