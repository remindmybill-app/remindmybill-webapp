import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { format } from 'date-fns';
import Link from 'next/link';
import RetryButton from './_components/RetryButton';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    await requireAdmin();
    const sp = await searchParams;
    const supabase = createAdminClient();

    // Build Stripe query
    const stripeParams: Record<string, unknown> = { limit: 100 };
    if (sp.status && sp.status !== 'all') {
        stripeParams.status = sp.status;
    }

    let invoiceData: Awaited<ReturnType<typeof stripe.invoices.list>>['data'] = [];
    try {
        const result = await stripe.invoices.list(stripeParams as Parameters<typeof stripe.invoices.list>[0]);
        invoiceData = result.data;
    } catch {
        // Stripe error — show empty
    }

    // Get email lookup map
    const customerIds = [...new Set(invoiceData.map((i) => i.customer as string).filter(Boolean))];

    let emailMap: Record<string, string> = {};
    if (customerIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('stripe_customer_id, email')
            .in('stripe_customer_id', customerIds);

        (profiles || []).forEach((p) => {
            if (p.stripe_customer_id) {
                emailMap[p.stripe_customer_id] = p.email;
            }
        });
    }

    const failedInvoices = invoiceData.filter(
        (i) => i.status === 'open' || i.status === 'uncollectible'
    );
    const revenueAtRisk = failedInvoices.reduce(
        (sum, i) => sum + (i.amount_due || 0),
        0
    );

    const rows = invoiceData.map((inv) => ({
        id: inv.id,
        email: emailMap[inv.customer as string] || (inv.customer as string) || '—',
        amount: `$${((inv.amount_due || 0) / 100).toFixed(2)}`,
        status: inv.status || 'unknown',
        attempts: inv.attempt_count || 0,
        lastAttempt: inv.created
            ? format(new Date(inv.created * 1000), 'MMM d, yyyy')
            : '—',
        nextRetry: inv.next_payment_attempt
            ? format(new Date(inv.next_payment_attempt * 1000), 'MMM d, HH:mm')
            : '—',
        canRetry: inv.status === 'open' || inv.status === 'uncollectible',
    }));

    const currentStatus = sp.status || 'all';
    const tabs = ['all', 'paid', 'open', 'uncollectible'];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold text-white">Billing Monitor</h1>

            {/* Revenue at Risk Banner */}
            {revenueAtRisk > 0 && (
                <div className="bg-red-950/40 border border-red-800 rounded-xl px-5 py-3">
                    <p className="text-red-400 text-sm font-semibold">
                        ⚠ Revenue at Risk: ${(revenueAtRisk / 100).toFixed(2)}
                    </p>
                </div>
            )}

            {/* Status Filter Tabs */}
            <div className="flex gap-2">
                {tabs.map((tab) => (
                    <Link
                        key={tab}
                        href={`/admin/billing${tab === 'all' ? '' : `?status=${tab}`}`}
                        className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${currentStatus === tab
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                            }`}
                    >
                        {tab}
                    </Link>
                ))}
            </div>

            {/* Invoices Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                <th className="text-left px-5 py-3">User</th>
                                <th className="text-left px-5 py-3">Amount</th>
                                <th className="text-left px-5 py-3">Status</th>
                                <th className="text-left px-5 py-3">Attempts</th>
                                <th className="text-left px-5 py-3">Last Attempt</th>
                                <th className="text-left px-5 py-3">Next Retry</th>
                                <th className="text-left px-5 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="border-b border-gray-800/50">
                                    <td className="px-5 py-3 text-gray-300 text-xs">
                                        {row.email}
                                    </td>
                                    <td className="px-5 py-3 text-white">{row.amount}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${row.status === 'paid'
                                                ? 'bg-green-900/50 text-green-300'
                                                : row.status === 'open'
                                                    ? 'bg-yellow-900/50 text-yellow-300'
                                                    : row.status === 'uncollectible'
                                                        ? 'bg-red-900/50 text-red-300'
                                                        : 'bg-gray-700 text-gray-300'
                                                }`}
                                        >
                                            {row.status}
                                        </span>
                                        {row.attempts === 2 && (
                                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300">
                                                2nd attempt
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400">{row.attempts}</td>
                                    <td className="px-5 py-3 text-gray-400 text-xs">
                                        {row.lastAttempt}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400 text-xs">
                                        {row.nextRetry}
                                    </td>
                                    <td className="px-5 py-3">
                                        {row.canRetry && <RetryButton invoiceId={row.id} />}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-5 py-8 text-center text-gray-500"
                                    >
                                        No invoices found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
