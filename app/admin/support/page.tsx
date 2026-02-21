import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import SupportClient from './_components/SupportClient';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    await requireAdmin();
    const sp = await searchParams;
    const supabase = createAdminClient();

    const status = sp.status || 'open';

    const { data: tickets } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    const tabs = ['open', 'resolved'];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold text-white">Support Inbox</h1>

            {/* Status Filter Tabs */}
            <div className="flex gap-2">
                {tabs.map((tab) => (
                    <Link
                        key={tab}
                        href={`/admin/support?status=${tab}`}
                        className={`text-sm px-4 py-1.5 rounded-lg border transition-colors capitalize ${status === tab
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                            }`}
                    >
                        {tab}
                    </Link>
                ))}
            </div>

            <SupportClient tickets={tickets || []} />
        </div>
    );
}
