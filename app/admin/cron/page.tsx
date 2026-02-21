import { requireAdmin, createAdminClient } from '@/lib/supabase/admin';
import CronClient from './_components/CronClient';

export const dynamic = 'force-dynamic';

const JOBS = ['reminders', 'process-cancellations', 'reset-limits'];

export default async function AdminCronPage() {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data: cronLogs } = await supabase
        .from('cron_logs')
        .select('*')
        .in('job_name', JOBS)
        .order('last_run', { ascending: false });

    // Build latest per job
    const latestMap: Record<string, (typeof cronLogs extends (infer T)[] | null ? T : never)> = {};
    (cronLogs || []).forEach((log) => {
        if (!latestMap[log.job_name]) {
            latestMap[log.job_name] = log;
        }
    });

    const jobData = JOBS.map((name) => ({
        name,
        lastRun: latestMap[name]?.last_run || null,
        status: latestMap[name]?.status || 'success',
        result: latestMap[name]?.result || 'No prior run',
    }));

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold text-white">Cron Jobs</h1>
            <CronClient jobs={jobData} />
        </div>
    );
}
