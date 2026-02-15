"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"

export function CategoryCard({ name, value, previousValue, color, currency, onClick }) {
    // Enforce 2 decimal places for math precision
    const currentVal = Number(value.toFixed(2))
    const prevVal = Number((previousValue || 0).toFixed(2))

    const delta = (prevVal && prevVal !== 0)
        ? ((currentVal - prevVal) / prevVal) * 100
        : (currentVal > 0 ? 100 : 0)

    const getDeltaColor = () => {
        if (delta > 0.01) return "text-red-500"
        if (delta < -0.01) return "text-emerald-500"
        return "text-zinc-400"
    }

    const getDeltaIcon = () => {
        if (delta > 0.01) return <ArrowUp className="h-3 w-3" />
        if (delta < -0.01) return <ArrowDown className="h-3 w-3" />
        return <Minus className="h-3 w-3" />
    }

    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-800 hover:shadow-lg hover:border-indigo-100 dark:hover:border-indigo-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
        >
            <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full group-hover:ring-4 ring-indigo-50 dark:ring-indigo-500/10 transition-all" style={{ backgroundColor: color }} />
                <div>
                    <p className="font-bold text-sm tracking-tight">{name}</p>
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${getDeltaColor()}`}>
                        {getDeltaIcon()}
                        <span>{Math.abs(delta).toFixed(1)}% vs Last Month</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-sm">{formatCurrency(currentVal, currency)}</p>
            </div>
        </div>
    )
}
