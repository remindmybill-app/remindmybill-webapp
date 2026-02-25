"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TrendingUp, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { calculateHealthScore } from "@/lib/analytics"

export function HealthScoreGauge({ score, isLoading, size = "md" }: { score: number; isLoading: boolean; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-24 w-24",
    md: "h-44 w-44",
    lg: "h-52 w-52"
  }
  const textClasses = {
    sm: "text-3xl",
    md: "text-5xl",
    lg: "text-6xl"
  }

  return (
    <div className={`relative mx-auto ${sizeClasses[size]}`}>
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              className="text-muted"
            />
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 85}`}
              strokeDashoffset={`${2 * Math.PI * 85 * (1 - score / 100)}`}
              className="text-primary transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`font-bold text-primary ${textClasses[size]}`}>{score}</div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">Health</div>
          </div>
        </>
      )}
    </div>
  )
}

export function OptimizationPanel() {
  const { subscriptions, isLoading } = useSubscriptions()
  const score = isLoading ? 0 : calculateHealthScore(subscriptions)

  const getOptimizationLevel = (score: number): "low" | "medium" | "high" => {
    if (score >= 80) return "high"
    if (score >= 60) return "medium"
    return "low"
  }

  const optimizationLevel = getOptimizationLevel(score)

  return (
    <Card className="border-2 shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Portfolio Optimization</h3>
              <p className="text-xs text-muted-foreground">AI-driven financial insights</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-4 border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Efficiency Level</span>
                <Badge variant={optimizationLevel === 'high' ? 'default' : 'secondary'} className="capitalize">
                  {optimizationLevel}
                </Badge>
              </div>
              <p className="text-sm text-foreground">
                {score < 100
                  ? "We've identified potential savings in your inactive subscriptions."
                  : "Your portfolio is fully optimized. Excellent management!"}
              </p>
            </div>

            <Button className="w-full gap-2 shadow-sm" asChild>
              <Link href="/analytics">
                <Sparkles className="h-4 w-4" />
                View Recommendations
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function FinancialHealthCard() {
  const { subscriptions, isLoading } = useSubscriptions()

  // Use the centralized health score algorithm from lib/analytics
  const score = isLoading ? 0 : calculateHealthScore(subscriptions)

  return (
    <Card className="overflow-hidden border-2 h-full">
      <CardContent className="p-6 flex flex-col items-center justify-center h-full">
        <HealthScoreGauge score={score} isLoading={isLoading} size="md" />
      </CardContent>
    </Card >
  )
}
