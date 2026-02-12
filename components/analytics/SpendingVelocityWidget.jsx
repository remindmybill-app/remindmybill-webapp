"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"

export function SpendingVelocityWidget({ currentSpend, lastMonthSameDaySpend, currency }) {
    const diff = currentSpend - lastMonthSameDaySpend
    const percentage = lastMonthSameDaySpend !== 0 ? (diff / lastMonthSameDaySpend) * 100 : 0
    const isUp = diff > 0
    const isDown = diff < 0

    return (
        <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Spending Velocity</p>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${isUp ? 'bg-red-100 text-red-600' : isDown ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-600'}`}>
                        {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {Math.abs(percentage).toFixed(1)}%
                    </div>
                </div>
                <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(Number(currentSpend.toFixed(2)), currency)}</h3>
                    <p className="text-xs text-muted-foreground">vs {formatCurrency(Number(lastMonthSameDaySpend.toFixed(2)), currency)} same day last month</p>
                </div>
            </CardContent>
        </Card>
    )
}
