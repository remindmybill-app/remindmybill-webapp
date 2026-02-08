"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Calendar, Activity, TrendingDown, Target, Zap, BarChart3, ArrowRight, ArrowUpRight, Info, AlertTriangle, ArrowUp } from "lucide-react"
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
  const [activeView, setActiveView] = useState<"trends" | "timeline">("trends")

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
        timelineGroups: [],
        upcoming14DaysTotal: 0
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
      return {
        month,
        spending: totalMonthlySpend,
      }
    })

    // Detect Potential Savings
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

    // Calculate Timeline Data (Next 30 Days)
    const timelineMap = new Map<string, { date: Date, subs: any[] }>()
    let upcoming14DaysTotal = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fourteenDaysLater = new Date(today)
    fourteenDaysLater.setDate(today.getDate() + 14)

    validSubscriptions.forEach(sub => {
      const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
      const dateKey = nextDate.toISOString().split('T')[0]
      const convertedCost = convertCurrency(sub.cost, sub.currency, userCurrency) / (sub.shared_with_count || 1)

      if (nextDate <= fourteenDaysLater) {
        upcoming14DaysTotal += convertedCost
      }

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
      .filter(g => g.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 30)

    return {
      totalMonthlySpend,
      activeCount: subscriptions.length,
      categoryData: categoryData || [],
      upcomingRenewals: upcomingRenewals || [],
      projectedSavings: totalRecoverable,
      savingsOpportunities,
      spendingTrendData,
      yearlyProjection,
      timelineGroups,
      upcoming14DaysTotal
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
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Financial Insight</h1>
            <p className="mt-2 text-muted-foreground">
              Subscription trends and spending optimization
            </p>
          </div>

          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
            <button
              onClick={() => setActiveView('trends')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'trends' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Spending Trends
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'timeline' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Payment Calendar
            </button>
          </div>
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
                  <p className="text-2xl font-bold tracking-tight">{formatCurrency(analytics.totalMonthlySpend, userCurrency)}</p>
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
                  <p className="text-2xl font-bold tracking-tight">{analytics.activeCount}</p>
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
                  <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(analytics.projectedSavings, userCurrency)}</p>
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
                  <p className="text-2xl font-bold tracking-tight">{formatCurrency(analytics.yearlyProjection, userCurrency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {activeView === 'trends' ? (
          <>
            {/* Spending Trend Area Chart */}
            <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 mb-10 overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  <CardTitle className="text-xl font-bold">Spending Trends</CardTitle>
                </div>
                <CardDescription>Monthly subscription costs over time</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <div className="h-[300px] w-full mt-4">
                  <ErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.spendingTrendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} dy={10} minTickGap={20} />
                        <YAxis hide={true} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px', padding: '8px 12px' }} formatter={(value: number) => [`$${value}`, "Spending"]} />
                        <Area type="monotone" dataKey="spending" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSpending)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ErrorBoundary>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-10 lg:grid-cols-2">
              <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-violet-500" />
                    <CardTitle className="text-xl font-bold">Category Allocation</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="flex flex-col items-center gap-10 sm:flex-row">
                    <div className="h-[250px] w-full sm:w-1/2">
                      <ErrorBoundary>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={analytics.categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                              {analytics.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
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
                          <span className="text-sm font-bold">{formatCurrency(category.value, userCurrency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-indigo-200/50 bg-indigo-50/30 dark:border-indigo-500/20 dark:bg-indigo-500/5 shadow-sm overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-indigo-600" />
                      <CardTitle className="text-xl font-bold">Potential Savings</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="mb-8 rounded-2xl bg-white/80 p-6 text-center shadow-inner dark:bg-zinc-900/50 backdrop-blur-sm">
                    <p className="text-5xl font-extrabold tracking-tighter text-indigo-600 dark:text-indigo-400">{formatCurrency(analytics.projectedSavings, userCurrency)}</p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-indigo-900/60 dark:text-indigo-300/50">Est. Annual Recoverable</p>
                  </div>
                  <div className="space-y-3">
                    {analytics.savingsOpportunities.map((opportunity) => (
                      <div key={opportunity.id} className="flex items-center justify-between rounded-xl border border-white/40 bg-white/40 p-4 dark:border-white/5 dark:bg-white/5">
                        <div>
                          <span className="block text-sm font-bold">{opportunity.name}</span>
                          <span className="text-[11px] text-muted-foreground">{opportunity.reason}</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-600">Save {formatCurrency(opportunity.annualSaving, userCurrency)}/yr</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Cash Flow Planner</h3>
                <p className="text-indigo-100 text-sm">Upcoming expenses for the next 30 days</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-3xl font-black tracking-tighter">{formatCurrency(analytics.upcoming14DaysTotal, userCurrency)}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Total in next 14 days</p>
              </div>
            </div>

            <div className="grid gap-6">
              {analytics.timelineGroups.map((group) => {
                const isHighSpend = group.totalDayCost > 50;
                return (
                  <div key={group.dateKey} className="relative pl-8">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
                    <div className={`absolute left-[-4px] top-2 h-2 w-2 rounded-full ${isHighSpend ? 'bg-orange-500 ring-4 ring-orange-500/20' : 'bg-indigo-500'}`} />

                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-sm font-bold flex items-center gap-2 ${isHighSpend ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500'}`}>
                        {group.date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                        {isHighSpend && <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 text-[10px] h-5">High Spend Day</Badge>}
                      </h4>
                      <span className="text-xs font-bold text-muted-foreground">{formatCurrency(group.totalDayCost, userCurrency)} Total</span>
                    </div>

                    <div className="grid gap-3">
                      {group.subs.map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-100 dark:bg-zinc-900/40 dark:border-zinc-800 hover:shadow-md transition-all">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold text-xs">{sub.name.substring(0, 1)}</div>
                            <div>
                              <p className="font-bold text-sm">{sub.name}</p>
                              <p className="text-xs text-muted-foreground">{sub.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(sub.costInUserCurrency, userCurrency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
