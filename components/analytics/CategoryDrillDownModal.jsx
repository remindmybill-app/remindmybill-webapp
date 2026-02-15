"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from "@/lib/utils/currency"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Ban, Wallet, Crown } from "lucide-react"

export function CategoryDrillDownModal({
    isOpen,
    onClose,
    categoryName,
    subscriptions,
    color,
    userCurrency = "USD"
}) {
    // Filter subs for this category
    const categorySubs = useMemo(() => {
        if (!categoryName || !subscriptions) return []
        return subscriptions.filter(sub =>
            sub.status === 'active' &&
            sub.category === categoryName
        ).sort((a, b) => b.cost - a.cost)
    }, [categoryName, subscriptions])

    // Calculate total
    const totalCost = useMemo(() => {
        return categorySubs.reduce((sum, sub) => sum + sub.cost, 0)
    }, [categorySubs])

    // Find heaviest contributor
    const heaviestContributor = categorySubs[0]
    const heaviestShare = heaviestContributor ? Math.round((heaviestContributor.cost / totalCost) * 100) : 0

    // Calculate 6-month trend (simulated for now based on creation date to show "growth" if subs added recently)
    // Or we can just show a flat line if costs haven't changed, but that's boring.
    // Let's generate a "history" based on when subs were created.
    const trendData = useMemo(() => {
        const months = []
        const today = new Date()

        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const monthLabel = date.toLocaleString('default', { month: 'short' })
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)

            // Sum of subs that existed at monthEnd
            const value = categorySubs.reduce((sum, sub) => {
                const createdAt = new Date(sub.created_at)
                if (createdAt <= monthEnd) {
                    return sum + sub.cost // Simplified: assuming monthly cost
                }
                return sum
            }, 0)

            months.push({ month: monthLabel, value })
        }
        return months
    }, [categorySubs])

    if (!categoryName) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-zinc-50 dark:bg-zinc-950 border-white dark:border-zinc-800 p-0 overflow-hidden gap-0 rounded-3xl">
                {/* Header Section with Color Gradient */}
                <div className="p-8 pb-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-white/10 opacity-20" style={{ backgroundColor: color }} />

                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                                <h2 className="text-2xl font-bold tracking-tight">{categoryName}</h2>
                            </div>
                            <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(totalCost, userCurrency)}
                                <span className="text-lg text-muted-foreground font-medium ml-2">/mo</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="rounded-full h-8 text-xs font-bold gap-1 border-dashed">
                                <Wallet className="w-3 h-3" /> Set Budget
                            </Button>
                        </div>
                    </div>

                    {/* Mini Trend Chart */}
                    <div className="h-[120px] w-full mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: color, fontWeight: 'bold' }}
                                    formatter={(val) => [formatCurrency(Number(val), userCurrency), 'Spend']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={color}
                                    strokeWidth={3}
                                    dot={{ fill: 'white', stroke: color, strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-8 space-y-8">
                    {/* Heaviest Contributor Card */}
                    {heaviestContributor && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center">
                                    <Crown className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Top Spender</p>
                                    <p className="font-medium text-sm">
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{heaviestContributor.name}</span> is {heaviestShare}% of this category
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-indigo-600">
                                <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Subscription List */}
                    <div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Subscriptions ({categorySubs.length})</h3>
                        <div className="space-y-3">
                            {categorySubs.map(sub => (
                                <div key={sub.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-500">
                                            {sub.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{sub.name}</p>
                                            <p className="text-xs text-muted-foreground">{sub.frequency || 'Monthly'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="font-bold text-sm">{formatCurrency(sub.cost, sub.currency || userCurrency)}</p>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                            title="Cancel Subscription"
                                        >
                                            <Ban className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
