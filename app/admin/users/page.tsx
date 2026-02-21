import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import { format } from 'date-fns';
import Link from 'next/link';
import UserFilters from './_components/UserFilters';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; tier?: string }>;
}) {
    await requireAdmin();
    const sp = await searchParams;
    const supabase = createAdminClient();

    let query = supabase
        .from('profiles')
        .select('id, full_name, email, tier, created_at, last_login')
        .order('created_at', { ascending: false })
        .limit(200);

    if (sp.search) {
        query = query.or(
            `email.ilike.%${sp.search}%,full_name.ilike.%${sp.search}%`
        );
    }

    if (sp.tier && sp.tier !== 'all') {
        query = query.eq('tier', sp.tier);
    }

    const { data: users } = await query;

    // Get subscription counts per user
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id');

    const subCountMap: Record<string, number> = {};
    (subs || []).forEach((s) => {
        subCountMap[s.user_id] = (subCountMap[s.user_id] || 0) + 1;
    });

    const tierBadge = (tier: string) => {
        switch (tier) {
            case 'pro':
                return 'bg-blue-900 text-blue-300';
            case 'lifetime':
                return 'bg-purple-900 text-purple-300';
            default:
                return 'bg-gray-700 text-gray-300';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold text-white">User Management</h1>

            <UserFilters currentSearch={sp.search} currentTier={sp.tier} />

            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                <th className="text-left px-5 py-3">Name</th>
                                <th className="text-left px-5 py-3">Email</th>
                                <th className="text-left px-5 py-3">Tier</th>
                                <th className="text-left px-5 py-3">Signed Up</th>
                                <th className="text-left px-5 py-3">Subs</th>
                                <th className="text-left px-5 py-3">Last Login</th>
                                <th className="text-left px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(users || []).map((user) => (
                                <tr
                                    key={user.id}
                                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                                >
                                    <td className="px-5 py-3 text-white">
                                        {user.full_name || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-gray-300">{user.email}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${tierBadge(
                                                user.tier || 'free'
                                            )}`}
                                        >
                                            {user.tier || 'free'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-400 text-xs">
                                        {user.created_at
                                            ? format(new Date(user.created_at), 'MMM d, yyyy')
                                            : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400">
                                        {subCountMap[user.id] || 0}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400 text-xs">
                                        {user.last_login
                                            ? format(new Date(user.last_login), 'MMM d, HH:mm')
                                            : 'Never'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <Link
                                            href={`/admin/users/${user.id}`}
                                            className="text-blue-400 hover:text-blue-300 text-xs"
                                        >
                                            View →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {(!users || users.length === 0) && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-5 py-8 text-center text-gray-500"
                                    >
                                        No users found
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
