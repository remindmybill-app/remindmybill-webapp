"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Layers, Clock } from "lucide-react"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { formatCurrency, convertCurrency } from "@/lib/utils/currency"
import { useProfile } from "@/lib/hooks/use-profile"

import { getNextRenewalDate, getRenewalDisplay } from "@/lib/utils/date-utils"

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  colorClass,
  isLoading
}: {
  label: string;
  value: string;
  icon: any;
  trend?: string | null;
  colorClass?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="border-2 shadow-sm h-full">
      <CardContent className="p-5 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {trend && (
            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-5">
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold tracking-tight ${colorClass || ""}`}>
            {isLoading ? "..." : value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickStats() {
  const { subscriptions, isLoading } = useSubscriptions()
  const { profile } = useProfile()

  const userCurrency = profile?.default_currency || "USD"
  const totalMonthlySpend = subscriptions.reduce((sum, sub) => {
    const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
    return sum + converted
  }, 0)
  const activeCount = subscriptions.length

  // Find next renewal with rollover logic
  const nextRenewal =
    subscriptions.length > 0
      ? subscriptions.reduce((earliest, sub) => {
        const earliestDate = getNextRenewalDate(earliest.renewal_date, earliest.frequency)
        const subDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
        return subDate < earliestDate ? sub : earliest
      })
      : null

  let renewalValue = "None"
  let renewalColor = ""

  if (nextRenewal) {
    const nextDate = getNextRenewalDate(nextRenewal.renewal_date, nextRenewal.frequency)
    const { label, statusColor } = getRenewalDisplay(nextDate)
    renewalValue = `${nextRenewal.name} - ${label}`
    renewalColor = statusColor
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Total Monthly Spend"
        value={formatCurrency(totalMonthlySpend, profile?.default_currency)}
        icon={DollarSign}
        trend="+2.5%"
        isLoading={isLoading}
      />
      <StatCard
        label="Active Subscriptions"
        value={activeCount.toString()}
        icon={Layers}
        trend="+1"
        isLoading={isLoading}
      />
      <StatCard
        label="Next Renewal"
        value={renewalValue}
        colorClass={renewalColor}
        icon={Clock}
        isLoading={isLoading}
      />
    </div>
  )
}
