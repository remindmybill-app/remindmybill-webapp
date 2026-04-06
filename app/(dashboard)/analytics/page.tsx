"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, BarChart2, ArrowRight, Info, AlertTriangle, AlertCircle, Lock } from "lucide-react"
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
import { ProGateOverlay } from "@/components/analytics/ProGateOverlay"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isPro } from "@/lib/subscription-utils"
import Link from "next/link"

// Helper to get last 6 months
const getLast6Months = () => {
  const months: string[] = []
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
        inflationAlerts: [],
        upcoming7DaysTotal: 0,
        upcoming7DaysCount: 0
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
      const date = new Date()
      const targetDate = new Date(date.getFullYear(), date.getMonth() - (5 - i), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() - (5 - i) + 1, 0)

      const monthlyTotal = validSubscriptions.reduce((sum, sub) => {
        if (new Date(sub.created_at) > monthEnd) return sum
        if (sub.is_enabled === false || sub.status !== 'active') return sum

        const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
        const cost = converted / (sub.shared_with_count || 1)

        const freq = sub.frequency?.toLowerCase() || 'monthly'

        if (freq === 'monthly') {
          return sum + cost
        }

        if (freq === 'yearly' || freq === 'annual') {
          const renewalDate = new Date(sub.renewal_date)
          if (renewalDate.getMonth() === targetDate.getMonth()) {
            return sum + cost
          }
        }

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

      if (filterMonth) {
        const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
        const monthLabel = nextDate.toLocaleString("default", { month: "short" })
        const freq = sub.frequency?.toLowerCase() || 'monthly'

        if (freq === 'yearly' || freq === 'annual') {
          if (monthLabel !== filterMonth) return
        }
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

    // Calculate 7-day heavy week forecast
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    let upcoming7DaysTotal = 0
    let upcoming7DaysCount = 0
    validSubscriptions.forEach(sub => {
      if (sub.is_enabled === false || sub.status !== 'active') return
      const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
      if (nextDate >= today && nextDate <= nextWeek) {
        const converted = convertCurrency(sub.cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)
        upcoming7DaysTotal += converted
        upcoming7DaysCount++
      }
    })

    return {
      totalMonthlySpend,
      activeCount: subscriptions.filter(s => s.is_enabled !== false && s.status !== 'cancelled').length,
      categoryData,
      spendingTrendData,
      velocity,
      forecast,
      inflationAlerts,
      upcoming7DaysTotal,
      upcoming7DaysCount
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
  const isProUser = !isFreeUser

  return <AnalyticsContent
    analytics={analytics}
    subscriptions={subscriptions}
    userCurrency={userCurrency}
    filterMonth={filterMonth}
    setFilterMonth={setFilterMonth}
    drillDownCategory={drillDownCategory}
    setDrillDownCategory={setDrillDownCategory}
    isFreeUser={isFreeUser}
    isProUser={isProUser}
    isLoading={isLoading}
  />
}

// Extracted to a separate component so hooks are unconditional at top level
function AnalyticsContent({
  analytics,
  subscriptions,
  userCurrency,
  filterMonth,
  setFilterMonth,
  drillDownCategory,
  setDrillDownCategory,
  isFreeUser,
  isProUser,
  isLoading,
}: {
  analytics: any
  subscriptions: any[]
  userCurrency: string
  filterMonth: string | null
  setFilterMonth: (v: string | null) => void
  drillDownCategory: string | null
  setDrillDownCategory: (v: string | null) => void
  isFreeUser: boolean
  isProUser: boolean
  isLoading: boolean
}) {
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)

  useEffect(() => {
    if (isProUser && !isLoading) {
      const hasVisited = localStorage.getItem('rmb_analytics_first_visit') === 'true'
      if (!hasVisited) {
        setShowWelcomeBanner(true)
        localStorage.setItem('rmb_analytics_first_visit', 'true')
      }
    }
  }, [isProUser, isLoading])

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Page Title */}
        <div className="flex flex-col gap-1.5 px-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm">Deep dive into your spending trends and subscription habits.</p>
        </div>

        {/* Welcome Banner (Pro users only, first visit) */}
        {showWelcomeBanner && (
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-800/40 p-6 sm:p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 shadow-2xl shadow-emerald-900/20 mb-8">
             <div className="absolute -right-20 -top-20 h-64 w-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
             <div className="flex items-center gap-5 relative z-10 w-full sm:w-auto">
                <div className="h-14 w-14 bg-emerald-500/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-emerald-500/20">
                   <BarChart3 className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                   <h2 className="text-2xl font-bold mb-1.5 tracking-tight text-white">Welcome to Analytics!</h2>
                   <p className="text-gray-300 text-sm leading-relaxed max-w-lg">💡 <strong className="text-emerald-400">Pro tip:</strong> Add 3+ subscriptions to unlock full trend forecasting.<br/>📈 Your category breakdown updates monthly based on active renewals.</p>
                </div>
             </div>
             <Button variant="outline" className="shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/30 h-11 px-6 rounded-xl relative z-10 w-full sm:w-auto font-semibold backdrop-blur-md transition-all" onClick={() => setShowWelcomeBanner(false)}>
                Dismiss
             </Button>
          </div>
        )}

        {isFreeUser ? (
          <>
            {/* ================================================================
                FREE USER LAYOUT
               ================================================================ */}
            {/* HEAVY WEEK WIDGET */}
            {analytics.upcoming7DaysTotal > 0 && (
              <div className="sticky top-4 z-20 bg-red-500/10 border border-red-400 rounded-3xl p-6 mb-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <div>
                    <h3 className="font-bold text-lg text-red-900 dark:text-red-100">Heavy Week Ahead</h3>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {analytics.upcoming7DaysCount > 0 ? `${formatCurrency(analytics.upcoming7DaysTotal, userCurrency)} due in next 7 days` : `${formatCurrency(247, userCurrency)} due in next 7 days`}
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl">
                  <Link href="/analytics#payment-timeline" onClick={(e) => {
                    const el = document.getElementById('payment-timeline');
                    if (el) {
                      e.preventDefault();
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}>More Information</Link>
                </Button>
              </div>
            )}

            {/* Smart Insights Carousel */}
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

            {/* Main Content Grid - Free */}
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                {/* Payment Timeline */}
                <div id="payment-timeline">
                  <PaymentTimeline
                    subscriptions={subscriptions}
                    selectedMonth={filterMonth}
                    userCurrency={userCurrency}
                    onReset={() => setFilterMonth(null)}
                  />
                </div>
              </div>

              {/* Right Column: Activity Feed + Categories */}
              <div className="space-y-8">
                {/* Activity Feed */}
                <ActivityFeed
                  subscriptions={subscriptions}
                  userCurrency={userCurrency}
                />

                {/* Category Breakdown */}
                <div id="category-breakdown" className="space-y-6">
                  <h3 className="text-lg font-bold px-2">Category Breakdown</h3>
                  {analytics.categoryData.map((category: any, index: number) => (
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

            {/* PRO UPGRADE SECTION */}
            <div className="mt-12 space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">🔒</span>
                    <h3 className="text-emerald-950 dark:text-white font-semibold text-lg">Unlock Pro Analytics</h3>
                  </div>
                  <p className="text-emerald-800 dark:text-gray-400 text-sm">
                    Get deeper insights into your spending habits. Trends, forecasts, and velocity tracking.
                  </p>
                </div>
                <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2 rounded-xl shrink-0">
                  <Link href="/pricing">Upgrade to Pro &rarr;</Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProGateOverlay
                  sectionName="Spending Velocity"
                  description="Track your month-over-month spending pace and spot trends early."
                >
                  <SpendingVelocityWidget
                    currentSpend={analytics.velocity.current}
                    lastMonthSameDaySpend={analytics.velocity.last}
                    currency={userCurrency}
                  />
                </ProGateOverlay>

                <ProGateOverlay
                  sectionName="Bill Forecast"
                  description="See projected spending for the next 3 months based on your active bills."
                >
                  <ForecastArcWidget
                    paid={analytics.forecast.paid}
                    total={analytics.forecast.total}
                    currency={userCurrency}
                  />
                </ProGateOverlay>

                <ProGateOverlay
                  sectionName="Spending Trends"
                  description="Visualize 6 months of spending history with month-over-month comparisons."
                >
                  <SpendingTrendsChart
                    data={analytics.spendingTrendData}
                    selectedMonth={filterMonth}
                    onBarClick={() => {}}
                  />
                </ProGateOverlay>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ================================================================
                PRO USER LAYOUT (Unchanged)
               ================================================================ */}
            {/* HEAVY WEEK WIDGET */}
            {analytics.upcoming7DaysTotal > 0 && (
              <div className="sticky top-4 z-20 bg-red-500/10 border border-red-400 rounded-3xl p-6 mb-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <div>
                    <h3 className="font-bold text-lg text-red-900 dark:text-red-100">Heavy Week Ahead</h3>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {analytics.upcoming7DaysCount > 0 ? `${formatCurrency(analytics.upcoming7DaysTotal, userCurrency)} due in next 7 days` : `${formatCurrency(247, userCurrency)} due in next 7 days`}
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl">
                  <Link href="/analytics#payment-timeline" onClick={(e) => {
                    const el = document.getElementById('payment-timeline');
                    if (el) {
                      e.preventDefault();
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}>More Information</Link>
                </Button>
              </div>
            )}

            {/* Velocity + Forecast */}
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

            {/* Smart Insights Carousel */}
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

            {/* Main Content Grid */}
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                <div id="spending-trends">
                  <SpendingTrendsChart
                    data={analytics.spendingTrendData}
                    selectedMonth={filterMonth}
                    onBarClick={(payload: any) => setFilterMonth(payload.month === filterMonth ? null : payload.month)}
                  />
                </div>

                <div id="payment-timeline">
                  <PaymentTimeline
                    subscriptions={subscriptions}
                    selectedMonth={filterMonth}
                    userCurrency={userCurrency}
                    onReset={() => setFilterMonth(null)}
                  />
                </div>
              </div>

              {/* Right Column: Activity Feed + Categories */}
              <div className="space-y-8">
                <ActivityFeed
                  subscriptions={subscriptions}
                  userCurrency={userCurrency}
                />

                <div id="category-breakdown" className="space-y-6">
                  <h3 className="text-lg font-bold px-2">Category Breakdown</h3>
                  {analytics.categoryData.map((category: any, index: number) => (
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
          </>
        )}

        {/* Category Drill Down Modal */}
        <CategoryDrillDownModal
          isOpen={!!drillDownCategory}
          onClose={() => setDrillDownCategory(null)}
          categoryName={drillDownCategory || ""}
          subscriptions={subscriptions}
          color={analytics.categoryData.find((c: any) => c.name === drillDownCategory)?.color || "#6366f1"}
          userCurrency={userCurrency}
        />
      </div>
    </div>
  )
}
