import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import { format } from 'date-fns';
import CancellationChart from './_components/CancellationChart';

export const dynamic = 'force-dynamic';

export default async function AdminCancellationsPage() {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data: surveys } = await supabase
        .from('cancellation_surveys')
        .select('*, profiles(email, full_name)')
        .order('created_at', { ascending: false });

    const allSurveys = surveys || [];

    // Aggregate reason counts — top 8
    const reasonMap: Record<string, number> = {};
    allSurveys.forEach((s) => {
        const reason = s.reason || 'Unknown';
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });

    const chartData = Object.entries(reasonMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([reason, count]) => ({ reason, count }));

    // Win-Back candidates
    const winBackRegex = /love|great|good|like|would consider|maybe later/i;
    const winBackCandidates = allSurveys.filter(
        (s) => s.feedback && winBackRegex.test(s.feedback)
    );

    function getProfile(survey: (typeof allSurveys)[0]) {
        if (!survey.profiles) return { email: '—', full_name: '—' };
        if (Array.isArray(survey.profiles)) return survey.profiles[0] || { email: '—', full_name: '—' };
        return survey.profiles;
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold text-white">Cancellation Insights</h1>

            {/* CHART */}
            <CancellationChart data={chartData} />

            {/* RECENT CANCELLATIONS */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="px-5 py-3 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-white">
                        Recent Cancellations
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                <th className="text-left px-5 py-2">User Email</th>
                                <th className="text-left px-5 py-2">Reason</th>
                                <th className="text-left px-5 py-2">Feedback</th>
                                <th className="text-left px-5 py-2">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allSurveys.slice(0, 20).map((s) => {
                                const profile = getProfile(s);
                                return (
                                    <tr key={s.id} className="border-b border-gray-800/50">
                                        <td className="px-5 py-3 text-gray-300 text-xs">
                                            {profile.email}
                                        </td>
                                        <td className="px-5 py-3 text-gray-400">{s.reason}</td>
                                        <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate">
                                            {s.feedback || '—'}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 text-xs">
                                            {s.created_at
                                                ? format(new Date(s.created_at), 'MMM d, yyyy')
                                                : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {allSurveys.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-4 text-center text-gray-500"
                                    >
                                        No cancellation data
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WIN-BACK CANDIDATES */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="px-5 py-3 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="text-yellow-400">★</span> Win-Back Candidates (
                        {winBackCandidates.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                <th className="text-left px-5 py-2">User Email</th>
                                <th className="text-left px-5 py-2">Reason</th>
                                <th className="text-left px-5 py-2">Feedback</th>
                                <th className="text-left px-5 py-2">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {winBackCandidates.map((s) => {
                                const profile = getProfile(s);
                                return (
                                    <tr
                                        key={s.id}
                                        className="border-b border-gray-800/50 bg-yellow-900/5"
                                    >
                                        <td className="px-5 py-3 text-yellow-300 text-xs">
                                            {profile.email}
                                        </td>
                                        <td className="px-5 py-3 text-gray-400">{s.reason}</td>
                                        <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate">
                                            {s.feedback || '—'}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 text-xs">
                                            {s.created_at
                                                ? format(new Date(s.created_at), 'MMM d, yyyy')
                                                : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {winBackCandidates.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-4 text-center text-gray-500"
                                    >
                                        No win-back candidates yet
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
