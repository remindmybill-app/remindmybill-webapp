
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Calendar, Activity, TrendingDown, Target, Zap, BarChart3 } from "lucide-react"
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
} from "recharts"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// Mock data for spending trend (last 12 months)
const spendingTrendData = [
  { month: "Jan", spending: 128.5 },
  { month: "Feb", spending: 135.2 },
  { month: "Mar", spending: 142.8 },
  { month: "Apr", spending: 138.9 },
  { month: "May", spending: 145.6 },
  { month: "Jun", spending: 152.3 },
  { month: "Jul", spending: 148.7 },
  { month: "Aug", spending: 155.4 },
  { month: "Sep", spending: 149.8 },
  { month: "Oct", spending: 142.5 },
  { month: "Nov", spending: 139.6 },
  { month: "Dec", spending: 142.5 },
]

export default function AnalyticsPage() {
  const { subscriptions, isLoading } = useSubscriptions()

  const analytics = useMemo(() => {
    if (subscriptions.length === 0) {
      return {
        totalMonthlySpend: 0,
        activeCount: 0,
        categoryData: [],
        upcomingRenewals: [],
        projectedSavings: 0,
        lowUsageSubs: [],
      }
    }

    const totalMonthlySpend = subscriptions.reduce((sum, sub) => sum + sub.cost, 0)

    // Group by category
    const categoryMap = new Map<string, number>()
    subscriptions.forEach((sub) => {
      const current = categoryMap.get(sub.category) || 0
      categoryMap.set(sub.category, current + sub.cost)
    })

    const colors = [
      "hsl(var(--indigo-500))",
      "hsl(var(--violet-500))",
      "hsl(var(--emerald-500))",
      "hsl(var(--orange-500))",
      "hsl(var(--pink-500))",
    ]

    const categoryData = Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: `hsl(${220 + index * 40}, 70%, 60%)`, // Dynamic fintech colors
      }))
      .sort((a, b) => b.value - a.value)

    // Calculate upcoming renewals
    const upcomingRenewals = (subscriptions || [])
      .map((sub) => {
        const renewalDate = new Date(sub.renewal_date)
        const today = new Date()
        const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        return {
          name: sub.name,
          date: renewalDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          cost: sub.cost,
          daysUntil,
        }
      })
      .filter((r) => r.daysUntil > 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5)

    // Calculate projected savings from low trust score subscriptions
    const lowUsageSubs = (subscriptions || []).filter((sub) => sub.trust_score < 50)
    const projectedSavings = lowUsageSubs.reduce((sum, sub) => sum + sub.cost * 12, 0)

    return {
      totalMonthlySpend,
      activeCount: subscriptions.length,
      categoryData: categoryData || [],
      upcomingRenewals: upcomingRenewals || [],
      projectedSavings,
      lowUsageSubs: lowUsageSubs || [],
    }
  }, [subscriptions])

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
                  <p className="text-2xl font-bold tracking-tight">${analytics.totalMonthlySpend.toFixed(2)}</p>
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
                  <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">${analytics.projectedSavings.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
                  <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Next Renewal</p>
                  <p className="text-2xl font-bold tracking-tight">
                    {analytics.upcomingRenewals[0]?.daysUntil || "-"} {analytics.upcomingRenewals[0] ? "days" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spending Trend Area Chart */}
        <Card className="mb-10 rounded-3xl border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
          <CardHeader className="p-6 pb-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-xl font-bold">Spending Trend</CardTitle>
            </div>
            <CardDescription>12-month trailing subscription expenditures</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="h-[350px] w-full pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.17 250)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="oklch(0.65 0.17 250)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.25 0.05 250 / 0.1)" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(0, 0, 0, 0.1)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      backdropFilter: "blur(4px)"
                    }}
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spending"
                    stroke="hsl(var(--indigo-500))"
                    strokeWidth={3}
                    fill="url(#spendingGradient)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Category Breakdown */}
          <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-500" />
                <CardTitle className="text-xl font-bold">Category Allocation</CardTitle>
              </div>
              <CardDescription>Monthly budget distribution across sectors</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="flex flex-col items-center gap-10 sm:flex-row">
                <div className="h-[250px] w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
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
                </div>
                <div className="w-full space-y-4 sm:w-1/2">
                  {analytics.categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{category.name}</span>
                      </div>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">${category.value.toFixed(0)}</span>
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
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-xl font-bold text-indigo-900 dark:text-indigo-50">Spending Efficiency</CardTitle>
              </div>
              <CardDescription className="text-indigo-700/70 dark:text-indigo-300/60">Identified leakages and annual saving potential</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="mb-8 rounded-2xl bg-white/80 p-6 text-center shadow-inner dark:bg-zinc-900/50 backdrop-blur-sm">
                <p className="text-5xl font-extrabold tracking-tighter text-indigo-600 dark:text-indigo-400">
                  ${analytics.projectedSavings.toFixed(0)}
                </p>
                <p className="mt-2 text-sm font-semibold text-indigo-900/60 dark:text-indigo-300/50 uppercase tracking-widest">Est. Annual Recoverable</p>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-900/40 dark:text-blue-200/40">Critical Reductions</h4>
                <div className="space-y-2">
                  {analytics.lowUsageSubs?.map((sub, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl border border-white/40 bg-white/40 p-4 dark:border-white/5 dark:bg-white/5 shadow-sm">
                      <div>
                        <span className="block text-sm font-bold text-indigo-950 dark:text-indigo-50">{sub.name}</span>
                        <span className="text-xs text-indigo-600/60 dark:text-indigo-300/60">Security Score: {sub.trust_score}%</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-heavy text-emerald-600 dark:text-emerald-400">Save ${(sub.cost * 12).toFixed(0)}/yr</p>
                      </div>
                    </div>
                  ))}
                  {analytics.lowUsageSubs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-indigo-200 p-8 text-center bg-white/20">
                      <p className="text-sm text-indigo-600/60">No high-risk expenditures detected.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
