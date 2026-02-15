"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Bell, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { format, isToday, isYesterday, parseISO, subMonths, subYears, addMonths, addYears } from "date-fns"

export function ActivityFeed({ subscriptions, userCurrency = "USD" }) {
    const activities = useMemo(() => {
        const events = []
        const now = new Date()
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)

        subscriptions.forEach(sub => {
            // 1. Simulate recent renewal
            // Logic: Find the most recent past payment date
            if (sub.status === 'active') {
                let checkDate = parseISO(sub.renewal_date)
                // Normalize checkDate to be the "next" renewal. 
                // We want to find if the *previous* cycle fell in the last 7 days.

                // If renewal_date is future, we rollback one cycle to find "last payment"
                const freq = sub.frequency?.toLowerCase() || 'monthly'

                // Safety loop limit
                let activeDate = new Date(checkDate)

                // If the future renewal is close (e.g. today), it might logically be "paying today" depending on time.
                // But usually "renewal_date" update happens after payment. 
                // Let's assume renewal_date IS the next payment. 
                // So last payment was = renewal_date - 1 cycle.

                let lastPayment = new Date(activeDate)
                if (freq === 'yearly' || freq === 'annual') {
                    lastPayment = subYears(activeDate, 1)
                } else {
                    lastPayment = subMonths(activeDate, 1) // default monthly
                }

                // If this lastPayment is within window?
                if (lastPayment >= sevenDaysAgo && lastPayment <= now) {
                    events.push({
                        id: `pay-${sub.id}`,
                        type: 'payment',
                        date: lastPayment,
                        subName: sub.name,
                        amount: sub.cost,
                        currency: sub.currency
                    })
                }

                // Also check if "renewal_date" itself is today (due today)
                if (isToday(activeDate)) {
                    events.push({
                        id: `due-${sub.id}`,
                        type: 'upcoming',
                        date: activeDate,
                        subName: sub.name,
                        amount: sub.cost,
                        currency: sub.currency
                    })
                }
            }

            // 2. Price Changes
            if (sub.last_price_change_date) {
                const changeDate = parseISO(sub.last_price_change_date)
                if (changeDate >= sevenDaysAgo && changeDate <= now) {
                    const diff = sub.cost - (sub.previous_cost || 0)
                    events.push({
                        id: `price-${sub.id}`,
                        type: 'price_change',
                        date: changeDate,
                        subName: sub.name,
                        amount: diff,
                        isIncrease: diff > 0,
                        currency: sub.currency
                    })
                }
            }
        })

        return events.sort((a, b) => b.date.getTime() - a.date.getTime())
    }, [subscriptions])

    if (activities.length === 0) {
        return (
            <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <CardHeader className="p-6 pb-2">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-4 text-center">
                    <p className="text-sm text-muted-foreground">No recent activity detected.</p>
                </CardContent>
            </Card>
        )
    }

    // Group by day
    const grouped = activities.reduce((acc, activity) => {
        let key = format(activity.date, 'MMM d')
        if (isToday(activity.date)) key = 'Today'
        if (isYesterday(activity.date)) key = 'Yesterday'

        if (!acc[key]) acc[key] = []
        acc[key].push(activity)
        return acc
    }, {})

    return (
        <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
            <CardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-lg font-bold">Latest Activity</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-6">
                {Object.entries(grouped).map(([day, items]) => (
                    <div key={day} className="relative pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                        <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-indigo-100 border-2 border-indigo-500 dark:bg-zinc-900" />
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 leading-none">{day}</h4>
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {item.type === 'payment' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                        {item.type === 'upcoming' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                        {item.type === 'price_change' && (
                                            item.isIncrease
                                                ? <TrendingUp className="h-4 w-4 text-red-500" />
                                                : <TrendingDown className="h-4 w-4 text-emerald-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                                            <span className="font-bold">{item.subName}</span>
                                            {item.type === 'payment' && ' renewed'}
                                            {item.type === 'upcoming' && ' is due'}
                                            {item.type === 'price_change' && (item.isIncrease ? ' price hike' : ' price drop')}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-xs font-bold ${item.type === 'price_change'
                                                    ? (item.isIncrease ? 'text-red-600' : 'text-emerald-600')
                                                    : 'text-zinc-500'
                                                }`}>
                                                {item.type === 'price_change' && (item.isIncrease ? '+' : '')}
                                                {formatCurrency(item.amount, item.currency || userCurrency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
