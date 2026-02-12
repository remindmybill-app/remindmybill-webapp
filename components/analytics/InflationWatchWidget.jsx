"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowUpRight, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils/currency"

export function InflationWatchWidget({ alerts, currency }) {
    if (!alerts || alerts.length === 0) {
        return (
            <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
                <CardContent className="p-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Price Stability</h3>
                    <p className="text-sm text-muted-foreground">No recent price increases detected across your subscriptions.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="rounded-3xl border-orange-100 bg-orange-50/30 dark:border-orange-500/10 dark:bg-orange-500/5 shadow-sm overflow-hidden">
            <CardHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg font-bold">Inflation Watch</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="space-y-3">
                    {alerts.map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-orange-100 dark:bg-zinc-900/40 dark:border-orange-500/10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 font-bold">
                                    {alert.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-sm tracking-tight">{alert.name}</p>
                                    <p className="text-[11px] text-orange-600 font-bold">+{alert.increase} price hike</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right mr-2">
                                    <p className="text-xs text-muted-foreground line-through">{formatCurrency(alert.previousCost, currency)}</p>
                                    <p className="font-bold text-sm">{formatCurrency(alert.currentCost, currency)}</p>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-orange-100">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <Button variant="link" className="mt-4 text-orange-600 dark:text-orange-400 p-0 h-auto font-bold text-xs uppercase tracking-widest flex items-center gap-1">
                    Review All Changes <ArrowUpRight className="h-3 w-3" />
                </Button>
            </CardContent>
        </Card>
    )
}
