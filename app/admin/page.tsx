import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
    await requireAdmin();
    const supabase = createAdminClient();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
        { data: profiles },
        { data: signups7d },
        { data: signups30d },
        { count: activeSubs },
        { data: subCategories },
        { data: cronLogs },
        { data: failedPayments },
    ] = await Promise.all([
        supabase.from('profiles').select('user_tier, created_at, payment_failed'),
        supabase.from('profiles').select('id').gte('created_at', sevenDaysAgo),
        supabase.from('profiles').select('id').gte('created_at', thirtyDaysAgo),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subscriptions').select('category'),
        supabase.from('cron_logs').select('*').order('last_run', { ascending: false }),
        supabase
            .from('profiles')
            .select('id')
            .eq('payment_failed', true)
            .gte('updated_at', startOfMonth),
    ]);

    const allProfiles = profiles || [];
    const freeCount = allProfiles.filter((p) => p.user_tier === 'free' || !p.user_tier).length;
    const proCount = allProfiles.filter((p) => p.user_tier === 'pro').length;
    const lifetimeCount = allProfiles.filter((p) => p.user_tier === 'lifetime').length;
    const totalUsers = allProfiles.length;
    const failedCount = failedPayments?.length || 0;
    const mrr = (proCount * 9.99).toFixed(2);
    const revenueAtRisk = totalUsers > 0 ? ((failedCount / totalUsers) * 100).toFixed(1) : '0.0';

    // Top 3 categories by frequency
    const catMap: Record<string, number> = {};
    (subCategories || []).forEach((s) => {
        const cat = s.category || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    // Deduplicate cron logs by job_name (keep most recent per job)
    const cronMap = new Map<string, typeof cronLogs extends (infer T)[] | null ? T : never>();
    (cronLogs || []).forEach((log) => {
        if (!cronMap.has(log.job_name)) {
            cronMap.set(log.job_name, log);
        }
    });
    const uniqueCronLogs = Array.from(cronMap.values());

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold text-foreground">Overview Dashboard</h1>

            {/* ROW 1: Core Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Free Users" value={freeCount} />
                <StatCard label="Pro Users" value={proCount} />
                <StatCard label="Lifetime" value={lifetimeCount} />
                <StatCard label="Active Subs" value={activeSubs || 0} />
            </div>

            {/* ROW 2: Growth & Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="New (7 days)" value={signups7d?.length || 0} />
                <StatCard label="New (30 days)" value={signups30d?.length || 0} />
                <StatCard label="MRR Estimate" value={`$${mrr}`} />
                <StatCard
                    label="Failed Payments"
                    value={`${revenueAtRisk}%`}
                    danger={parseFloat(revenueAtRisk) > 5}
                />
            </div>

            {/* TOP CATEGORIES */}
            <div className="bg-card rounded-xl border border-border">
                <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Top Categories</h2>
                </div>
                <div className="px-5 py-4 space-y-2">
                    {topCategories.length === 0 && (
                        <p className="text-gray-500 text-sm">No subscriptions yet</p>
                    )}
                    {topCategories.map(([cat, count]) => (
                        <div key={cat} className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm capitalize">{cat}</span>
                            <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-full">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CRON JOB STATUS */}
            <div className="bg-card rounded-xl border border-border">
                <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Cron Job Status</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                        <thead>
                            <tr className="text-xs text-muted-foreground">
                                <th className="text-left px-5 py-2">Job Name</th>
                                <th className="text-left px-5 py-2">Last Run</th>
                                <th className="text-left px-5 py-2">Status</th>
                                <th className="text-left px-5 py-2">Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueCronLogs.map((log) => (
                                <tr key={log.id} className="border-b border-border/50">
                                    <td className="px-5 py-3 text-foreground font-mono text-xs">
                                        {log.job_name}
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground">
                                        {log.last_run
                                            ? format(new Date(log.last_run), 'MMM d, HH:mm')
                                            : 'Never'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex text-xs px-2 py-0.5 rounded-full ${log.status === 'success'
                                                ? 'bg-green-900/50 text-green-300'
                                                : log.status === 'error'
                                                    ? 'bg-red-900/50 text-red-300'
                                                    : 'bg-yellow-900/50 text-yellow-300'
                                                }`}
                                        >
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-500 text-xs">
                                        {log.result || '—'}
                                    </td>
                                </tr>
                            ))}
                            {uniqueCronLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-4 text-gray-500 text-center">
                                        No cron logs yet
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

function StatCard({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string | number;
    danger?: boolean;
}) {
    return (
        <div
            className={`rounded-xl p-5 border ${danger
                ? 'bg-destructive/10 border-destructive'
                : 'bg-card border-border'
                }`}
        >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
                className={`text-2xl font-bold mt-1 ${danger ? 'text-destructive' : 'text-foreground'
                    }`}
            >
                {value}
            </p>
        </div>
    );
}
