import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import UserActions from './_components/UserActions';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireAdmin();
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !profile) {
        notFound();
    }

    const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', id);

    // Fetch Stripe invoices if stripe_customer_id exists
    let invoices: {
        date: string;
        amount: string;
        status: string;
        attempts: number;
        error: string | null;
    }[] = [];

    if (profile.stripe_customer_id) {
        try {
            const stripeInvoices = await stripe.invoices.list({
                customer: profile.stripe_customer_id,
                limit: 20,
            });

            invoices = stripeInvoices.data.map((inv) => ({
                date: inv.created
                    ? format(new Date(inv.created * 1000), 'MMM d, yyyy')
                    : '—',
                amount: `$${((inv.amount_due || 0) / 100).toFixed(2)}`,
                status: inv.status || 'unknown',
                attempts: inv.attempt_count || 0,
                error: inv.last_finalization_error?.message || null,
            }));
        } catch {
            // Stripe error — show empty invoices
        }
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-900/50 text-green-300';
            case 'cancelled':
                return 'bg-red-900/50 text-red-300';
            case 'paused':
                return 'bg-yellow-900/50 text-yellow-300';
            default:
                return 'bg-gray-700 text-gray-300';
        }
    };

    const invoiceStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-900/50 text-green-300';
            case 'open':
                return 'bg-yellow-900/50 text-yellow-300';
            case 'uncollectible':
                return 'bg-red-900/50 text-red-300';
            case 'void':
                return 'bg-gray-700 text-gray-300';
            default:
                return 'bg-gray-700 text-gray-300';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Back link */}
            <Link
                href="/admin/users"
                className="text-gray-400 hover:text-white text-sm"
            >
                ← Back to Users
            </Link>

            {/* HEADER */}
            <div className="flex flex-wrap items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-white">
                        {profile.full_name || 'Unnamed User'}
                    </h1>
                    <p className="text-gray-400 text-sm">{profile.email}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {profile.is_admin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-300">
                            Admin
                        </span>
                    )}
                    {profile.is_suspended && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300">
                            Suspended
                        </span>
                    )}
                    {profile.cancellation_scheduled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300">
                            Cancels {format(new Date(profile.cancellation_scheduled), 'MMM d')}
                        </span>
                    )}
                </div>
            </div>

            {/* ACCOUNT INFO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard label="Tier" value={profile.tier || 'free'} />
                <InfoCard
                    label="Signed Up"
                    value={
                        profile.created_at
                            ? format(new Date(profile.created_at), 'MMM d, yyyy')
                            : '—'
                    }
                />
                <InfoCard
                    label="Last Login"
                    value={
                        profile.last_login
                            ? format(new Date(profile.last_login), 'MMM d, HH:mm')
                            : 'Never'
                    }
                />
                <InfoCard
                    label="Stripe ID"
                    value={profile.stripe_customer_id || 'None'}
                />
            </div>

            {/* ADMIN ACTIONS */}
            <UserActions
                userId={id}
                currentTier={profile.tier || 'free'}
                isSuspended={!!profile.is_suspended}
            />

            {/* SUBSCRIPTIONS TABLE */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="px-5 py-3 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-white">Subscriptions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                <th className="text-left px-5 py-2">Name</th>
                                <th className="text-left px-5 py-2">Cost</th>
                                <th className="text-left px-5 py-2">Renewal Date</th>
                                <th className="text-left px-5 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(subscriptions || []).map((sub) => (
                                <tr key={sub.id} className="border-b border-gray-800/50">
                                    <td className="px-5 py-3 text-white">{sub.name}</td>
                                    <td className="px-5 py-3 text-gray-300">
                                        ${Number(sub.cost || 0).toFixed(2)}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400 text-xs">
                                        {sub.renewal_date
                                            ? format(new Date(sub.renewal_date), 'MMM d, yyyy')
                                            : '—'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(
                                                sub.status || 'active'
                                            )}`}
                                        >
                                            {sub.status || 'active'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(!subscriptions || subscriptions.length === 0) && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-4 text-center text-gray-500"
                                    >
                                        No subscriptions
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAYMENT HISTORY TABLE */}
            {invoices.length > 0 && (
                <div className="bg-gray-900 rounded-xl border border-gray-800">
                    <div className="px-5 py-3 border-b border-gray-800">
                        <h2 className="text-sm font-semibold text-white">
                            Payment History
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead>
                                <tr className="text-xs text-gray-500 border-b border-gray-800">
                                    <th className="text-left px-5 py-2">Date</th>
                                    <th className="text-left px-5 py-2">Amount</th>
                                    <th className="text-left px-5 py-2">Status</th>
                                    <th className="text-left px-5 py-2">Attempts</th>
                                    <th className="text-left px-5 py-2">Error Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv, i) => (
                                    <tr key={i} className="border-b border-gray-800/50">
                                        <td className="px-5 py-3 text-gray-300 text-xs">
                                            {inv.date}
                                        </td>
                                        <td className="px-5 py-3 text-white">{inv.amount}</td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${invoiceStatusBadge(
                                                    inv.status
                                                )}`}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-400">{inv.attempts}</td>
                                        <td className="px-5 py-3 text-red-400 text-xs">
                                            {inv.error || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-white font-medium mt-1 truncate">{value}</p>
        </div>
    );
}
