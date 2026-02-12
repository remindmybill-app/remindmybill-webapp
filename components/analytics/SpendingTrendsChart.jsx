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

export function SpendingTrendsChart({ data, onBarClick }) {
    if (!data || data.length === 0) {
        return (
            <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden h-[400px] flex items-center justify-center">
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
        <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
            <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-xl font-bold">Spending Trends</CardTitle>
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
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
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
                                className="cursor-pointer"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
