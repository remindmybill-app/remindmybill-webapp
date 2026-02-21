'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface CancellationChartProps {
    data: { reason: string; count: number }[];
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6'];

export default function CancellationChart({ data }: CancellationChartProps) {
    if (data.length === 0) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-500 text-sm text-center">
                    No cancellation data to chart
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
                Top Cancellation Reasons
            </h2>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis
                        dataKey="reason"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#111827',
                            border: '1px solid #374151',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 12,
                        }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[Math.min(index, 2)]}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
