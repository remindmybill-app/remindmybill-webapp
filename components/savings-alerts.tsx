"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, TrendingDown, Loader2 } from "lucide-react"
import { useState } from "react"

const alerts = [
  {
    service: "Adobe Creative Cloud",
    issue: "Not used in 30 days",
    savings: "$54.99",
    trend: "Low usage detected",
  },
  {
    service: "Planet Fitness",
    issue: "Last visit 45 days ago",
    savings: "$22.99",
    trend: "Consider canceling",
  },
]

export function SavingsAlerts() {
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: "keep" | "cancel" | null }>({})

  const handleKeep = (service: string) => {
    setLoadingStates((prev) => ({ ...prev, [service]: "keep" }))
    setTimeout(() => {
      setLoadingStates((prev) => ({ ...prev, [service]: null }))
    }, 1500)
  }

  const handleCancel = (service: string) => {
    setLoadingStates((prev) => ({ ...prev, [service]: "cancel" }))
    setTimeout(() => {
      setLoadingStates((prev) => ({ ...prev, [service]: null }))
    }, 1500)
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Potential Savings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert, index) => (
          <Card key={index} className="border border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold">{alert.service}</div>
                    <div className="text-sm text-muted-foreground">{alert.issue}</div>
                  </div>
                </div>

                <div className="rounded-lg bg-background/80 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Monthly Savings</span>
                    <span className="text-2xl font-bold text-primary">{alert.savings}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{alert.trend}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleKeep(alert.service)}
                    disabled={loadingStates[alert.service] !== null}
                    className="transition-all hover:bg-primary/10 hover:text-primary"
                  >
                    {loadingStates[alert.service] === "keep" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Keeping...
                      </>
                    ) : (
                      "Keep"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleCancel(alert.service)}
                    disabled={loadingStates[alert.service] !== null}
                    className="transition-all hover:bg-destructive/80"
                  >
                    {loadingStates[alert.service] === "cancel" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      "Cancel"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Summary */}
        <Card className="border-2 border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Total Potential Savings</div>
              <div className="text-3xl font-bold text-primary">$77.98</div>
              <div className="text-xs text-muted-foreground">Per month if cancelled</div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
