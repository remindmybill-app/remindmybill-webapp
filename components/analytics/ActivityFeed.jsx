"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Bell, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { format, isToday, isYesterday, parseISO } from "date-fns"

export function ActivityFeed({ subscriptions, userCurrency = "USD" }) {
    const activities = useMemo(() => {
        // Find last 5 real subscription events based on updated_at
        const sortedSubs = [...subscriptions].sort((a, b) => {
            const dateA = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime();
            const dateB = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();
            return dateB - dateA;
        });

        const recentSubs = sortedSubs.slice(0, 5);

        return recentSubs.map(sub => {
            const updatedAt = sub.updated_at ? new Date(sub.updated_at) : new Date(sub.created_at);
            const createdAt = new Date(sub.created_at);
            
            // Infer what happened
            let actionType = 'renewed';
            if (sub.status === 'cancelled' || sub.is_enabled === false) {
                actionType = 'paused';
            } else if (Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60000) {
                // created recently and no major updates
                actionType = 'added';
            }

            return {
                id: `act-${sub.id}-${updatedAt.getTime()}`,
                type: actionType,
                date: updatedAt,
                subName: sub.name,
                amount: sub.cost,
                currency: sub.currency
            };
        });
    }, [subscriptions])

    if (activities.length === 0) {
        return (
            <Card className="rounded-3xl border-border bg-card shadow-sm">
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
        <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-lg font-bold">Latest Activity</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-6">
                {Object.entries(grouped).map(([day, items]) => (
                    <div key={day} className="relative pl-4 border-l-2 border-border">
                        <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-background border-2 border-primary" />
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 leading-none">{day}</h4>
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {item.type === 'renewed' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                        {item.type === 'added' && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                                        {item.type === 'paused' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground leading-tight">
                                            <span className="font-bold">{item.subName}</span>
                                            {item.type === 'renewed' && ' Renewed'}
                                            {item.type === 'added' && ' Added'}
                                            {item.type === 'paused' && ' Paused'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-bold text-zinc-500">
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
