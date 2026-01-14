"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"

export function FinancialHealthCard() {
  const { subscriptions, isLoading } = useSubscriptions()

  const calculateHealthScore = () => {
    if (subscriptions.length === 0) return 0

    const avgTrustScore = subscriptions.reduce((sum, sub) => sum + sub.trust_score, 0) / subscriptions.length
    const unusedCount = subscriptions.filter(
      (sub) => sub.last_used_date && new Date(sub.last_used_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    ).length
    const usageScore = ((subscriptions.length - unusedCount) / subscriptions.length) * 100

    return Math.round(avgTrustScore * 0.6 + usageScore * 0.4)
  }

  const score = isLoading ? 0 : calculateHealthScore()

  const getOptimizationLevel = (score: number): "low" | "medium" | "high" => {
    if (score >= 80) return "high"
    if (score >= 60) return "medium"
    return "low"
  }

  const optimizationLevel = getOptimizationLevel(score)

  return (
    <Card className="overflow-hidden border-2">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Circular Progress Gauge */}
          <div className="relative mx-auto h-44 w-44 sm:h-52 sm:w-52">
            {isLoading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
                  <div className="text-5xl font-bold text-primary sm:text-6xl">{score}</div>
                  <div className="text-xs font-medium text-muted-foreground sm:text-sm">Health Score</div>
                </div>
              </>
            )}
          </div>

          {/* Optimization Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Optimization Score</div>
                <div className="text-lg font-bold capitalize text-primary sm:text-xl">{optimizationLevel}</div>
              </div>
            </div>

            <Button className="w-full" size="lg">
              View Recommendations
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
