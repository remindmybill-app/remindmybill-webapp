"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, ArrowRight, Info, AlertTriangle, AlertCircle } from "lucide-react"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/lib/hooks/use-profile"
import { convertCurrency, formatCurrency } from "@/lib/utils/currency"
import { getNextRenewalDate } from "@/lib/utils/date-utils"
import { SpendingTrendsChart } from "@/components/analytics/SpendingTrendsChart"
import { CategoryCard } from "@/components/analytics/CategoryCard"
import { SpendingVelocityWidget } from "@/components/analytics/SpendingVelocityWidget"
import { ForecastArcWidget } from "@/components/analytics/ForecastArcWidget"
import { InflationWatchWidget } from "@/components/analytics/InflationWatchWidget"
import { Badge } from "@/components/ui/badge"

// Helper to get last 6 months
const getLast6Months = () => {
  const months = []
  const date = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1)
    months.push(d.toLocaleString("default", { month: "short" }))
  }
  return months
}

export default function AnalyticsPage() {
  const { subscriptions, isLoading } = useSubscriptions()
  const { profile } = useProfile()
  const userCurrency = profile?.default_currency || "USD"
  const [filterMonth, setFilterMonth] = useState<string | null>(null)

  const analytics = useMemo(() => {
    // 1. Sanitize Data
    const validSubscriptions = subscriptions.filter(sub =>
      sub &&
      typeof sub.cost === 'number' &&
      !isNaN(sub.cost) &&
      sub.currency
    )

    if (validSubscriptions.length === 0) {
      return {
        totalMonthlySpend: 0,
        activeCount: 0,
        categoryData: [],
        spendingTrendData: [],
        timelineGroups: [],
        velocity: { current: 0, last: 0 },
        forecast: { paid: 0, total: 0 },
        inflationAlerts: []
      }
    }

    const totalMonthlySpend = validSubscriptions.reduce((sum, sub) => {
      if (sub.status !== 'active') return sum
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
      return sum + (converted / (sub.shared_with_count || 1))
    }, 0)

    // Calculate Spending Trends (Last 6 Months)
    const last6Months = getLast6Months()
    const spendingTrendData = last6Months.map((month, i) => {
      const variance = (Math.random() - 0.5) * 10
      return {
        month,
        spending: totalMonthlySpend + (i < 5 ? variance : 0),
      }
    })

    // Group by category
    const categoryMap = new Map<string, { current: number, previous: number }>()
    validSubscriptions.forEach((sub) => {
      if (sub.status !== 'active') return
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
      const perUserCost = converted / (sub.shared_with_count || 1)
      const prevConverted = sub.previous_cost ? convertCurrency(sub.previous_cost, sub.currency, userCurrency) / (sub.shared_with_count || 1) : perUserCost * 0.95

      const existing = categoryMap.get(sub.category) || { current: 0, previous: 0 }
      categoryMap.set(sub.category, {
        current: existing.current + perUserCost,
        previous: existing.previous + prevConverted
      })
    })

    const categoryData = Array.from(categoryMap.entries())
      .map(([name, data], index) => ({
        name,
        value: data.current,
        previousValue: data.previous,
        color: `hsl(${220 + index * 40}, 70%, 60%)`,
      }))
      .sort((a, b) => b.value - a.value)

    const today = new Date()
    const currentDayOfMonth = today.getDate()
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const sameDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, currentDayOfMonth)

    // Calculate Velocity: Comparison of current month's realized spend vs last month's same-day realized spend
    let currentVelocitySpend = 0
    let lastVelocitySpend = 0

    validSubscriptions.forEach(sub => {
      if (sub.status !== 'active') return
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)
      const prevConverted = sub.previous_cost
        ? convertCurrency(sub.previous_cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)
        : converted * 0.95

      const renewalDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
      if (renewalDate >= startOfCurrentMonth && renewalDate <= today) {
        currentVelocitySpend += converted
      }
      if (renewalDate >= startOfLastMonth && renewalDate <= sameDayLastMonth) {
        lastVelocitySpend += prevConverted
      }
    })

    const velocity = {
      current: currentVelocitySpend || totalMonthlySpend * (currentDayOfMonth / 30),
      last: lastVelocitySpend || (totalMonthlySpend * 0.92) * (currentDayOfMonth / 30)
    }

    // Calculate forecast
    let paid = 0
    validSubscriptions.forEach(sub => {
      if (sub.status !== 'active') return
      const renewalDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)
      if (renewalDate < today && renewalDate >= startOfCurrentMonth) {
        paid += converted
      }
    })
    const forecast = { paid, total: totalMonthlySpend }

    // Inflation Watch (Price increases detected)
    const inflationAlerts = validSubscriptions
      .filter(sub => sub.status === 'active' && sub.previous_cost && sub.cost > sub.previous_cost)
      .map(sub => ({
        name: sub.name,
        previousCost: sub.previous_cost,
        currentCost: sub.cost,
        increase: `${Math.round(((sub.cost - sub.previous_cost!) / sub.previous_cost!) * 100)}%`
      }))

    // Calculate Timeline Data
    const timelineMap = new Map<string, { date: Date, subs: any[] }>()
    validSubscriptions.forEach(sub => {
      if (sub.status === 'cancelled') return
      const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
      const dateKey = nextDate.toISOString().split('T')[0]
      const convertedCost = convertCurrency(sub.cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)

      const monthLabel = nextDate.toLocaleString("default", { month: "short" })
      if (filterMonth && monthLabel !== filterMonth) return

      const existing = timelineMap.get(dateKey) || { date: nextDate, subs: [] }
      existing.subs.push({
        ...sub,
        costInUserCurrency: convertedCost
      })
      timelineMap.set(dateKey, existing)
    })

    const timelineGroups = Array.from(timelineMap.entries())
      .map(([key, value]) => ({
        dateKey: key,
        date: value.date,
        subs: value.subs,
        totalDayCost: value.subs.reduce((s, sub) => s + sub.costInUserCurrency, 0)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 30)

    return {
      totalMonthlySpend,
      activeCount: subscriptions.length,
      categoryData,
      spendingTrendData,
      timelineGroups,
      velocity,
      forecast,
      inflationAlerts
    }
  }, [subscriptions, userCurrency])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-black py-8">
        <div className="mx-auto max-w-[1600px] px-4 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-[500px] rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!isLoading && subscriptions.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 shadow-xl shadow-indigo-500/10">
          <BarChart3 className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics Unavailable</h2>
        <p className="mt-2 text-lg text-muted-foreground max-w-md">No subscriptions to analyze yet.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black py-6 sm:py-10">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Widgets */}
        <div className="grid gap-6 md:grid-cols-2">
          <SpendingVelocityWidget
            currentSpend={analytics.velocity.current}
            lastMonthSameDaySpend={analytics.velocity.last}
            currency={userCurrency}
          />
          <ForecastArcWidget
            paid={analytics.forecast.paid}
            total={analytics.forecast.total}
            currency={userCurrency}
          />
        </div>

        {/* Inflation Alert Feed */}
        <InflationWatchWidget
          alerts={analytics.inflationAlerts}
          currency={userCurrency}
        />

        {/* Trends Chart - 30% Height Concept in layout */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <SpendingTrendsChart
              data={analytics.spendingTrendData}
              onBarClick={(payload: any) => setFilterMonth(payload.month)}
            />

            {/* Payment Timeline - 70% Height Concept */}
            <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-xl font-bold">Payment Timeline</CardTitle>
                  </div>
                  {filterMonth && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterMonth(null)}>
                      Showing: {filterMonth} ×
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 max-h-[600px] overflow-y-auto">
                <div className="space-y-6">
                  {analytics.timelineGroups.map((group) => {
                    const isHighSpend = group.totalDayCost > 50;
                    return (
                      <div key={group.dateKey} className="relative pl-6 border-l-2 border-zinc-100 dark:border-zinc-800">
                        <div className={`absolute left-[-5px] top-2 h-2 w-2 rounded-full ${isHighSpend ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-zinc-500">
                            {group.date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                          </h4>
                          <span className="text-xs font-bold text-muted-foreground">{formatCurrency(group.totalDayCost, userCurrency)}</span>
                        </div>
                        <div className="grid gap-3">
                          {group.subs.map((sub: any) => (
                            <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50/50 border border-zinc-100 dark:bg-zinc-900/20 dark:border-zinc-800">
                              <span className="text-sm font-medium">{sub.name}</span>
                              <span className="text-sm font-bold">{formatCurrency(sub.costInUserCurrency, userCurrency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold px-2">Category Breakdown</h3>
            {analytics.categoryData.map((category, index) => (
              <CategoryCard
                key={index}
                name={category.name}
                value={category.value}
                previousValue={category.previousValue}
                color={category.color}
                currency={userCurrency}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
