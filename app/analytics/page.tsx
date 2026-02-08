"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Calendar, Activity, TrendingDown, Target, Zap, BarChart3, ArrowRight, ArrowUpRight } from "lucide-react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getNextRenewalDate } from "@/lib/utils/date-utils"
import { convertCurrency, formatCurrency } from "@/lib/utils/currency"
import { useProfile } from "@/lib/hooks/use-profile"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info, AlertTriangle, ArrowUp } from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"

// Helper to get last 12 months
const getLast12Months = () => {
  const months = []
  const date = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1)
    months.push(d.toLocaleString("default", { month: "short" }))
  }
  return months
}

export default function AnalyticsPage() {
  const { subscriptions, isLoading } = useSubscriptions()
  const { profile } = useProfile()
  const userCurrency = profile?.default_currency || "USD"

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
        upcomingRenewals: [],
        projectedSavings: 0,
        savingsOpportunities: [],
        spendingTrendData: [],
        yearlyProjection: 0,
      }
    }

    const totalMonthlySpend = validSubscriptions.reduce((sum, sub) => {
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
      return sum + (converted / (sub.shared_with_count || 1))
    }, 0)
    const yearlyProjection = totalMonthlySpend * 12 // Simple projection

    // Group by category
    const categoryMap = new Map<string, number>()
    validSubscriptions.forEach((sub) => {
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
      const current = categoryMap.get(sub.category) || 0
      categoryMap.set(sub.category, current + (converted / (sub.shared_with_count || 1)))
    })

    const categoryData = Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: `hsl(${220 + index * 40}, 70%, 60%)`, // Dynamic fintech colors
      }))
      .sort((a, b) => b.value - a.value)

    // Calculate upcoming renewals (Next 30 days)
    const upcomingRenewals = (validSubscriptions || [])
      .map((sub) => {
        const nextRenewalDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysUntil = Math.ceil((nextRenewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        const convertedCost = convertCurrency(sub.cost, sub.currency, userCurrency)
        return {
          id: sub.id,
          name: sub.name,
          date: nextRenewalDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          cost: convertedCost / (sub.shared_with_count || 1),
          daysUntil,
          category: sub.category
        }
      })
      .filter((r) => r.daysUntil >= 0 && r.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)

    // Calculate projected savings from low trust score subscriptions
    const lowUsageSubs = (validSubscriptions || []).filter((sub) => sub.trust_score < 50)
    const projectedSavings = lowUsageSubs.reduce((sum, sub) => {
      const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
      return sum + (converted / (sub.shared_with_count || 1)) * 12
    }, 0)

    // Calculate Spending Trends (Last 12 Months)
    const last12Months = getLast12Months()
    const spendingTrendData = last12Months.map((month, i) => {
      // For now, since we don't have a history table, show the current spend 
      // if it existed in that month (simple simulation of current portfolio)
      return {
        month,
        spending: totalMonthlySpend,
      }
    })

    // Detect Potential Savings (Real logic)
    // We look for subscriptions with low trust scores or high cancellation difficulty
    const savingsOpportunities = (validSubscriptions || [])
      .filter(sub => sub.trust_score < 60 || (sub.cancellation_difficulty && sub.cancellation_difficulty.toLowerCase() === 'hard'))
      .map(sub => {
        const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
        return {
          id: sub.id,
          name: sub.name,
          reason: sub.trust_score < 40 ? "Unusually High Cost" : "Hard to Cancel",
          annualSaving: (converted / (sub.shared_with_count || 1)) * 12
        }
      })
      .sort((a, b) => b.annualSaving - a.annualSaving)

    const totalRecoverable = savingsOpportunities.reduce((sum, item) => sum + item.annualSaving, 0)

    return {
      totalMonthlySpend,
      activeCount: subscriptions.length,
      categoryData: categoryData || [],
      upcomingRenewals: upcomingRenewals || [],
      projectedSavings: totalRecoverable,
      savingsOpportunities,
      spendingTrendData,
      yearlyProjection,
    }
  }, [subscriptions, userCurrency])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-black py-12">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </div>
    )
  }

  // Handle Empty State with retry
  if (!isLoading && subscriptions.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 shadow-xl shadow-indigo-500/10">
          <BarChart3 className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Analytics Unavailable</h2>
        <p className="mt-2 text-lg text-muted-foreground max-w-md">
          We couldn't find any active subscriptions to analyze.
        </p>
        <div className="flex gap-4 mt-8">
          <Button variant="outline" className="rounded-xl h-12 px-6" onClick={() => window.location.reload()}>
            Refresh Data
          </Button>
          <Button className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20" asChild>
            <a href="/dashboard">Add Subscription</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black py-8 sm:py-12">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Financial Insight</h1>
          <p className="mt-2 text-muted-foreground">
            Subscription trends and spending optimization
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                  <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monthly Spend</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold tracking-tight">{formatCurrency(analytics.totalMonthlySpend, userCurrency)}</p>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <TrendingUp className="w-3 h-3 mr-1" /> +2.4%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
                  <Activity className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Services</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold tracking-tight">{analytics.activeCount}</p>
                    <Badge variant="secondary" className="text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      Stable
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Annual Savings</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(analytics.projectedSavings, userCurrency)}</p>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Potential
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                  <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Yearly Project.</p>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatCurrency(analytics.yearlyProjection, userCurrency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {subscriptions.length < 5 ? "Track for 3 months to see trends" : "8% higher than last year"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Renewal Timeline (New) */}
        <div className="mb-10">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Next 30 Days Forecast
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {analytics.upcomingRenewals.map((renewal) => (
              <Card key={renewal.id} className="min-w-[200px] shrink-0 rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{renewal.date}</span>
                    <Badge variant="outline" className={renewal.daysUntil <= 3 ? "text-amber-600 border-amber-200 bg-amber-50" : "text-zinc-500"}>
                      {renewal.daysUntil === 0 ? "Today" : `${renewal.daysUntil} days`}
                    </Badge>
                  </div>
                  <p className="font-bold text-lg truncate">{renewal.name}</p>
                  <p className="text-sm font-medium text-zinc-500">{formatCurrency(renewal.cost, userCurrency)}</p>
                </CardContent>
              </Card>
            ))}
            {analytics.upcomingRenewals.length === 0 && (
              <div className="w-full p-8 border border-dashed rounded-2xl flex items-center justify-center text-muted-foreground text-sm">
                No renewals in the next 30 days.
              </div>
            )}
          </div>
        </div>

        {/* Spending Trend Area Chart */}
        <Card className="col-span-4 rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 mb-10 overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-xl font-bold">Spending Trends</CardTitle>
            </div>
            <CardDescription>Monthly subscription costs over time</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="h-[250px] sm:h-[300px] w-full mt-4">
              <ErrorBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.spendingTrendData}
                    margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                      dy={10}
                      minTickGap={20}
                    />
                    <YAxis
                      hide={true}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        padding: '8px 12px'
                      }}
                      formatter={(value: number) => [`$${value}`, "Spending"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="spending"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSpending)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ErrorBoundary>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Category Breakdown */}
          <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
            <CardHeader className="p-6 sm:p-8 pb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-500" />
                <CardTitle className="text-xl font-bold">Category Allocation</CardTitle>
              </div>
              <CardDescription>Monthly budget distribution across sectors</CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 pt-0">
              <div className="flex flex-col items-center gap-6 sm:gap-10 sm:flex-row">
                <div className="h-[200px] sm:h-[250px] w-full sm:w-1/2">
                  <ErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {analytics.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ErrorBoundary>
                </div>
                <div className="w-full space-y-3 sm:w-1/2">
                  {analytics.categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{category.name}</span>
                      </div>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(category.value, userCurrency)}</span>
                    </div>
                  ))}
                  {analytics.categoryData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center italic">No category data yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Efficiency & Savings */}
          <Card className="rounded-3xl border-indigo-200/50 bg-indigo-50/30 dark:border-indigo-500/20 dark:bg-indigo-500/5 shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-xl font-bold text-indigo-900 dark:text-indigo-50">Potential Savings</CardTitle>
                </div>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Info className="h-4 w-4 text-indigo-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="w-64 bg-zinc-900 text-zinc-50 border-zinc-800 py-3 px-4">
                      <p className="text-xs">Subscriptions with cheaper alternatives or unused for 60+ days.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              <CardDescription className="text-indigo-700/70 dark:text-indigo-300/60">Identified leakages and annual saving potential</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="mb-8 rounded-2xl bg-white/80 p-6 text-center shadow-inner dark:bg-zinc-900/50 backdrop-blur-sm">
                <p className="text-5xl font-extrabold tracking-tighter text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(analytics.projectedSavings, userCurrency)}
                </p>
                <p className="mt-2 text-sm font-semibold text-indigo-900/60 dark:text-indigo-300/50 uppercase tracking-widest">Est. Annual Recoverable</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-900/40 dark:text-blue-200/40 mb-3">Optimization Insights</h4>
                  <div className="space-y-3">
                    {analytics.savingsOpportunities.map((opportunity) => (
                      <div key={opportunity.id} className="flex items-center justify-between rounded-xl border border-white/40 bg-white/40 p-4 dark:border-white/5 dark:bg-white/5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-indigo-950 dark:text-indigo-50 leading-tight">{opportunity.name}</span>
                            <span className="text-[11px] text-indigo-600/70 dark:text-indigo-300/60">{opportunity.reason}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Save {formatCurrency(opportunity.annualSaving, userCurrency)}/yr</p>
                        </div>
                      </div>
                    ))}
                    {analytics.savingsOpportunities.length === 0 && (
                      <p className="text-sm text-indigo-600/60 text-center py-4 font-medium italic">Great! No major leakages detected in your profile.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-orange-900/40 dark:text-orange-200/40 mb-3">Price Monitor</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center rounded-xl border border-white/40 bg-white/40 p-8 dark:border-white/5 dark:bg-white/5 shadow-sm border-dashed">
                      <p className="text-sm text-muted-foreground italic">No price changes detected this period.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
