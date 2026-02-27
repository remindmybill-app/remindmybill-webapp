"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils/currency"

export function ForecastArcWidget({ paid, total, currency }) {
    const remaining = total - paid
    const progress = total > 0 ? (paid / total) * 100 : 0

    return (
        <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bill Forecast</p>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{Math.round(progress)}% Paid</span>
                </div>
                <div className="space-y-4">
                    <Progress value={progress} className="h-2 bg-secondary" />
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Remaining</p>
                            <p className="text-xl font-bold">{formatCurrency(Number(remaining.toFixed(2)), currency)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total</p>
                            <p className="text-sm font-semibold opacity-70">{formatCurrency(Number(total.toFixed(2)), currency)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
