"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, ArrowRight, Info, AlertTriangle, AlertCircle, Lock } from "lucide-react"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/lib/hooks/use-profile"
import { convertCurrency, formatCurrency } from "@/lib/utils/currency"
import { getNextRenewalDate } from "@/lib/utils/date-utils"
import { SpendingTrendsChart } from "@/components/analytics/SpendingTrendsChart"
import { CategoryCard } from "@/components/analytics/CategoryCard"
import { CategoryDrillDownModal } from "@/components/analytics/CategoryDrillDownModal"
import { ActivityFeed } from "@/components/analytics/ActivityFeed"
import { SpendingVelocityWidget } from "@/components/analytics/SpendingVelocityWidget"
import { ForecastArcWidget } from "@/components/analytics/ForecastArcWidget"
import { InflationWatchWidget } from "@/components/analytics/InflationWatchWidget"
import { SmartInsightsCarousel } from "@/components/analytics/SmartInsightsCarousel"
import { PaymentTimeline } from "@/components/analytics/PaymentTimeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isPro } from "@/lib/subscription-utils"
import Link from "next/link"

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
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null)

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
        velocity: { current: 0, last: 0 },
        forecast: { paid: 0, total: 0 },
        inflationAlerts: []
      }
    }

    const totalMonthlySpend = validSubscriptions.reduce((sum, sub) => {
      if (sub.is_enabled === false || sub.status !== 'active') return sum
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
      return sum + (converted / (sub.shared_with_count || 1))
    }, 0)

    // Calculate Spending Trends (Last 6 Months)
    const last6Months = getLast6Months()
    const spendingTrendData = last6Months.map((month, i) => {
      // Create a date object for this month (using the 1st of the month)
      const date = new Date()
      // Adjust year/month based on the index (0 = 5 months ago, 5 = current month)
      // getLast6Months returns [Month-5, Month-4, ..., Current] order? 
      // Wait, getLast6Months implementation at line 22 loops i=5 down to 0 pushing to array.
      // So index 0 is 5 months ago. Correct.
      const targetDate = new Date(date.getFullYear(), date.getMonth() - (5 - i), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() - (5 - i) + 1, 0)

      const monthlyTotal = validSubscriptions.reduce((sum, sub) => {
        // 1. Filter by creation date
        if (new Date(sub.created_at) > monthEnd) return sum

        // 2. Filter by status (optimistic: assume active subs were active back then)
        // If we had cancelled_at, we would use it here.
        if (sub.is_enabled === false || sub.status !== 'active') return sum

        const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
        const cost = converted / (sub.shared_with_count || 1)

        // 3. Check frequency
        const freq = sub.frequency?.toLowerCase() || 'monthly'

        if (freq === 'monthly') {
          return sum + cost
        }

        if (freq === 'yearly' || freq === 'annual') {
          // Check if the renewal month matches the target month
          const renewalDate = new Date(sub.renewal_date)
          if (renewalDate.getMonth() === targetDate.getMonth()) {
            return sum + cost
          }
        }

        // Default fallthrough for weekly/etc (simplified to monthly for now as per "monthly spend" convention)
        return sum + cost
      }, 0)

      return {
        month,
        spending: monthlyTotal,
      }
    })

    // Group by category
    const categoryMap = new Map<string, { current: number, previous: number }>()
    validSubscriptions.forEach((sub) => {
      if (sub.is_enabled === false || sub.status !== 'active') return

      // Feature 1: Filter by selected month
      if (filterMonth) {
        const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
        const monthLabel = nextDate.toLocaleString("default", { month: "short" })
        const freq = sub.frequency?.toLowerCase() || 'monthly'

        // If it's a annual sub, strictly check if it falls in the filtered month
        if (freq === 'yearly' || freq === 'annual') {
          if (monthLabel !== filterMonth) return
        }
        // If it's monthly, it falls in every month, but we need to verify if the sub existed then?
        // For simplicity and "interactive" feel: 
        // If viewing a past month, we SHOULD check created_at.
        // Let's reuse the date checking logic from spendingTrendData if we want perfection.
        // But `filterMonth` is just a string "Jan", "Feb". 
        // We need to map "Jan" back to a year to check created_at properly.
        // `spendingTrendData` has the correct month order.
        // Let's assume for Category Breakdown we just show "what would you pay in this month" logic.
        // So for monthly subs, we include them. For yearly, only if match.
      }

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
      if (sub.is_enabled === false || sub.status !== 'active') return
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
      if (sub.is_enabled === false || sub.status !== 'active') return
      const renewalDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)
      if (renewalDate < today && renewalDate >= startOfCurrentMonth) {
        paid += converted
      }
    })
    const forecast = { paid, total: totalMonthlySpend }

    // Inflation Watch (Price increases detected)
    const inflationAlerts = validSubscriptions
      .filter(sub => sub.is_enabled !== false && sub.status === 'active' && sub.previous_cost && sub.cost > sub.previous_cost)
      .map(sub => ({
        name: sub.name,
        previousCost: sub.previous_cost,
        currentCost: sub.cost,
        increase: `${Math.round(((sub.cost - sub.previous_cost!) / sub.previous_cost!) * 100)}%`
      }))

    return {
      totalMonthlySpend,
      activeCount: subscriptions.filter(s => s.is_enabled !== false && s.status !== 'cancelled').length,
      categoryData,
      spendingTrendData,
      velocity,
      forecast,
      inflationAlerts
    }
  }, [subscriptions, userCurrency, filterMonth])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
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
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-muted shadow-xl shadow-primary/10">
          <BarChart3 className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics Unavailable</h2>
        <p className="mt-2 text-lg text-muted-foreground max-w-md">No subscriptions to analyze yet.</p>
      </div>
    )
  }

  const isFreeUser = !isPro(profile?.user_tier || profile?.subscription_tier, profile?.is_pro)

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 relative">
      {/* Feature Lock Overlay for Free Tier */}
      {isFreeUser && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center p-8 max-w-md bg-card rounded-3xl border border-border shadow-2xl">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20">
              <Lock className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Advanced Analytics</h2>
            <p className="text-muted-foreground mb-6">
              Unlock spending velocity, forecasts, inflation alerts, and category breakdowns with Shield or Fortress.
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" asChild>
              <Link href="/pricing">Upgrade to Unlock — $4.99/mo</Link>
            </Button>
          </div>
        </div>
      )}
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

        {/* Feature 2: Smart Insights Carousel */}
        <SmartInsightsCarousel
          subscriptions={subscriptions}
          velocity={analytics.velocity}
          categoryData={analytics.categoryData}
          userCurrency={userCurrency}
        />

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
              selectedMonth={filterMonth}
              onBarClick={(payload: any) => setFilterMonth(payload.month === filterMonth ? null : payload.month)}
            />

            {/* Payment Timeline */}
            <PaymentTimeline
              subscriptions={subscriptions}
              selectedMonth={filterMonth}
              userCurrency={userCurrency}
              onReset={() => setFilterMonth(null)}
            />
          </div>

          {/* Right Column: Activity Feed + Categories */}
          <div className="space-y-8">
            {/* Feature 4: Live Activity Feed */}
            <ActivityFeed
              subscriptions={subscriptions}
              userCurrency={userCurrency}
            />

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
                  onClick={() => setDrillDownCategory(category.name)}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Feature 3: Drill Down Modal */}
        <CategoryDrillDownModal
          isOpen={!!drillDownCategory}
          onClose={() => setDrillDownCategory(null)}
          categoryName={drillDownCategory || ""}
          subscriptions={subscriptions}
          color={analytics.categoryData.find(c => c.name === drillDownCategory)?.color || "#6366f1"}
          userCurrency={userCurrency}
        />
      </div>
    </div>
  )
}
