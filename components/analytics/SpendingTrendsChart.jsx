"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
};

export function SpendingTrendsChart({ data, selectedMonth, onBarClick }) {
    if (!data || data.length === 0) {
        return (
            <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden h-[400px] flex items-center justify-center">
                <div className="text-center p-6">
                    <BarChart3 className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">No spending history available</p>
                </div>
            </Card>
        )
    }

    // Pre-calculate deltas for colors
    const chartData = data.map((item, index) => {
        const prevValue = index > 0 ? data[index - 1].spending : item.spending
        const isIncrease = item.spending > prevValue
        const isDecrease = item.spending < prevValue

        return {
            ...item,
            color: isIncrease ? '#ef4444' : (isDecrease ? '#10b981' : '#6366f1'),
            delta: prevValue !== 0 ? ((item.spending - prevValue) / prevValue) * 100 : 0
        }
    })

    return (
        <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-xl font-bold">Spending Trends</CardTitle>
                    </div>
                    {selectedMonth && (
                        <div className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                            Viewing: {selectedMonth}
                        </div>
                    )}
                </div>
                <CardDescription>6-month spending history and monthly deltas</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} onClick={(data) => {
                            if (data && data.activePayload) {
                                onBarClick(data.activePayload[0].payload)
                            }
                        }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={({ x, y, payload }) => (
                                    <g transform={`translate(${x},${y})`}>
                                        <text
                                            x={0}
                                            y={0}
                                            dy={16}
                                            textAnchor="middle"
                                            fill={payload.value === selectedMonth ? '#6366f1' : 'var(--muted-foreground)'}
                                            fontWeight={payload.value === selectedMonth ? 'bold' : 'normal'}
                                            fontSize={10}
                                        >
                                            {payload.value}
                                        </text>
                                    </g>
                                )}
                                dy={10}
                            />
                            <YAxis hide={true} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    fontSize: '12px',
                                    padding: '8px 12px'
                                }}
                                formatter={(value) => [formatCurrency(Number(value.toFixed(2))), "Spending"]}
                            />
                            <Bar
                                dataKey="spending"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                                className="cursor-pointer transition-all duration-300"
                            >
                                {chartData.map((entry, index) => {
                                    const isSelected = selectedMonth === entry.month;
                                    const isDimmed = selectedMonth && !isSelected;

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            opacity={isDimmed ? 0.3 : 1}
                                            stroke={isSelected ? "var(--background)" : "none"}
                                            strokeWidth={isSelected ? 2 : 0}
                                            style={{
                                                filter: isSelected ? 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))' : 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                        />
                                    )
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
