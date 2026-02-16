import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"
import { formatCurrency, convertCurrency } from "@/lib/utils/currency"
import { getNextRenewalDate } from "@/lib/utils/date-utils"
import { useMemo } from "react"

interface PaymentTimelineProps {
    subscriptions: any[]
    selectedMonth: string | null
    userCurrency: string
    onReset: () => void
}

export function PaymentTimeline({ subscriptions, selectedMonth, userCurrency, onReset }: PaymentTimelineProps) {

    const timelineGroups = useMemo(() => {
        const timelineMap = new Map<string, { date: Date, subs: any[] }>()

        subscriptions.forEach(sub => {
            if (!sub || sub.status === 'cancelled' || typeof sub.cost !== 'number' || !sub.currency) return

            const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
            const dateKey = nextDate.toISOString().split('T')[0]
            const convertedCost = convertCurrency(sub.cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)

            const monthLabel = nextDate.toLocaleString("default", { month: "short" })

            // Filter logic
            if (selectedMonth && monthLabel !== selectedMonth) return

            const existing = timelineMap.get(dateKey) || { date: nextDate, subs: [] }
            existing.subs.push({
                ...sub,
                costInUserCurrency: convertedCost
            })
            timelineMap.set(dateKey, existing)
        })

        return Array.from(timelineMap.entries())
            .map(([key, value]) => ({
                dateKey: key,
                date: value.date,
                subs: value.subs,
                totalDayCost: value.subs.reduce((s, sub) => s + sub.costInUserCurrency, 0)
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 30)
    }, [subscriptions, selectedMonth, userCurrency])

    return (
        <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
            <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-xl font-bold">Payment Timeline</CardTitle>
                    </div>
                    {selectedMonth && (
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="px-3 py-1">
                                Showing: {selectedMonth}
                            </Badge>
                            <button
                                onClick={onReset}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider underline underline-offset-4"
                            >
                                Reset View
                            </button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 max-h-[600px] overflow-y-auto">
                <div className="space-y-6">
                    {timelineGroups.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            No payments found for {selectedMonth || "this period"}.
                        </div>
                    ) : (
                        timelineGroups.map((group) => {
                            const isHighSpend = group.totalDayCost > 50;
                            return (
                                <div key={group.dateKey} className="relative pl-6 border-l-2 border-zinc-100 dark:border-zinc-800">
                                    <div className={`absolute left-[-5px] top-2 h-2 w-2 rounded-full ${isHighSpend ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-bold text-zinc-500">
                                            {group.date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </h4>
                                        <span className="text-xs font-bold text-muted-foreground">{formatCurrency(Number(group.totalDayCost.toFixed(2)), userCurrency)}</span>
                                    </div>
                                    <div className="grid gap-3">
                                        {group.subs.map((sub: any) => (
                                            <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900/20 dark:border-zinc-800">
                                                <span className="text-sm font-medium">{sub.name}</span>
                                                <span className="text-sm font-bold">{formatCurrency(Number(sub.costInUserCurrency.toFixed(2)), userCurrency)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
