"use client"

import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, Layers, Clock } from "lucide-react"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { formatCurrency } from "@/lib/utils/currency"
import { useProfile } from "@/lib/hooks/use-profile"

export function QuickStats() {
  const { subscriptions, isLoading } = useSubscriptions()
  const { profile } = useProfile()

  const totalMonthlySpend = subscriptions.reduce((sum, sub) => sum + sub.cost, 0)
  const activeCount = subscriptions.length

  // Find next renewal
  const nextRenewal =
    subscriptions.length > 0
      ? subscriptions.reduce((earliest, sub) => {
          return new Date(sub.renewal_date) < new Date(earliest.renewal_date) ? sub : earliest
        })
      : null

  const daysUntilRenewal = nextRenewal
    ? Math.ceil((new Date(nextRenewal.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const stats = [
    {
      label: "Total Monthly Spend",
      value: isLoading ? "..." : formatCurrency(totalMonthlySpend, profile?.default_currency),
      icon: DollarSign,
      trend: "+2.5%",
    },
    {
      label: "Active Subscriptions",
      value: isLoading ? "..." : activeCount.toString(),
      icon: Layers,
      trend: "+1",
    },
    {
      label: "Next Renewal",
      value: isLoading ? "..." : nextRenewal ? `${nextRenewal.name} - ${daysUntilRenewal} days` : "None",
      icon: Clock,
      trend: null,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="border-2">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {stat.trend && <div className="text-xs font-medium text-muted-foreground">{stat.trend}</div>}
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</div>
                <div className="text-xl font-bold sm:text-2xl">{stat.value}</div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
