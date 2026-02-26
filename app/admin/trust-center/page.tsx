import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import TrustCenterClient from './_components/TrustCenterClient';

export const dynamic = 'force-dynamic';

export default async function AdminTrustCenterPage() {
    await requireAdmin();
    const supabase = createAdminClient();

    const [{ data: benchmarks }, { data: requests }] = await Promise.all([
        supabase
            .from('service_benchmarks')
            .select('*')
            .order('name', { ascending: true }),
        supabase
            .from('service_requests')
            .select('*, profiles(email)')
            .order('created_at', { ascending: false }),
    ]);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold text-foreground">Trust Center</h1>
            <TrustCenterClient
                benchmarks={benchmarks || []}
                requests={requests || []}
            />
        </div>
    );
}
