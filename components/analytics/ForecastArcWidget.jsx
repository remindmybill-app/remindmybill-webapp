"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils/currency"

export function ForecastArcWidget({ paid, total, currency }) {
    const remaining = total - paid
    const progress = total > 0 ? (paid / total) * 100 : 0

    return (
        <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bill Forecast</p>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{Math.round(progress)}% Paid</span>
                </div>
                <div className="space-y-4">
                    <Progress value={progress} className="h-2 bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Remaining</p>
                            <p className="text-xl font-bold">{formatCurrency(remaining, currency)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total</p>
                            <p className="text-sm font-semibold opacity-70">{formatCurrency(total, currency)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
