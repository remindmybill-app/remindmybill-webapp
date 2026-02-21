'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { triggerCronJob } from '@/app/admin/_actions/index';

interface CronJob {
    name: string;
    lastRun: string | null;
    status: string;
    result: string;
}

interface CronClientProps {
    jobs: CronJob[];
}

export default function CronClient({ jobs }: CronClientProps) {
    const [isPending, startTransition] = useTransition();
    const [runningJob, setRunningJob] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

    function handleRun(jobName: string) {
        setRunningJob(jobName);
        setResults((prev) => ({ ...prev, [jobName]: null }));

        startTransition(async () => {
            const result = await triggerCronJob(jobName);
            setResults((prev) => ({ ...prev, [jobName]: result }));
            setRunningJob(null);

            // Clear result after 4 seconds
            setTimeout(() => {
                setResults((prev) => ({ ...prev, [jobName]: null }));
            }, 4000);
        });
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {jobs.map((job) => {
                const isRunning = runningJob === job.name;
                const result = results[job.name];

                return (
                    <div
                        key={job.name}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3"
                    >
                        <h3 className="text-white font-mono text-sm">{job.name}</h3>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Last Run</span>
                                <span className="text-xs text-gray-400">
                                    {job.lastRun
                                        ? format(new Date(job.lastRun), 'MMM d, HH:mm')
                                        : 'Never'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Status</span>
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${job.status === 'success'
                                            ? 'bg-green-900/50 text-green-300'
                                            : job.status === 'error'
                                                ? 'bg-red-900/50 text-red-300'
                                                : 'bg-yellow-900/50 text-yellow-300'
                                        }`}
                                >
                                    {job.status}
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-500 text-xs">{job.result}</p>

                        {/* Run Now button */}
                        <button
                            onClick={() => handleRun(job.name)}
                            disabled={isPending || isRunning}
                            className="w-full text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
                        >
                            {isRunning ? 'Running…' : '▶ Run Now'}
                        </button>

                        {/* Result feedback */}
                        {result && (
                            <div
                                className={`text-xs px-3 py-2 rounded-lg ${result.success
                                        ? 'text-green-400 bg-green-900/20'
                                        : 'text-red-400 bg-red-900/20'
                                    }`}
                            >
                                {result.success ? '✓ Success' : `✗ Failed: ${result.message}`}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
