"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"

export function CategoryCard({ name, value, previousValue, color, currency }) {
    const delta = previousValue ? ((value - previousValue) / previousValue) * 100 : 0
    const isIncrease = value > previousValue
    const isDecrease = value < previousValue
    const isNeutral = value === previousValue || !previousValue

    const getDeltaColor = () => {
        if (isIncrease) return "text-red-500"
        if (isDecrease) return "text-emerald-500"
        return "text-zinc-400"
    }

    const getDeltaIcon = () => {
        if (isIncrease) return <ArrowUp className="h-3 w-3" />
        if (isDecrease) return <ArrowDown className="h-3 w-3" />
        return <Minus className="h-3 w-3" />
    }

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-800 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <div>
                    <p className="font-bold text-sm tracking-tight">{name}</p>
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${getDeltaColor()}`}>
                        {getDeltaIcon()}
                        <span>{Math.abs(delta).toFixed(1)}% vs Last Month</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-sm">{formatCurrency(value, currency)}</p>
            </div>
        </div>
    )
}
