"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, DollarSign, Shield, TrendingUp, CheckCircle2, PackageCheck } from "lucide-react"
import { useProfile } from "@/lib/hooks/use-profile"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { isPro, getTierDisplayName } from "@/lib/subscription-utils"

export default function ProfilePage() {
  const { profile, isLoading: profileLoading } = useProfile()
  const { subscriptions, isLoading: subsLoading } = useSubscriptions()

  if (profileLoading || subsLoading) {
    return <div className="p-8">Loading profile...</div>
  }

  // Derived stats
  const totalSaved = 0 // Needs a 'savings' field or logic, placeholder for now
  const daysTracked = profile?.created_at
    ? Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const optScore = 85 // Placeholder logic

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header with Avatar */}
        <div className="mb-8">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {profile?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="mb-2 text-4xl font-bold tracking-tight">{profile?.full_name || "User"}</h1>
              <p className="text-lg text-muted-foreground">{profile?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge className={isPro(profile?.subscription_tier)
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0"
                  : "bg-primary/20 text-primary"}>
                  {getTierDisplayName(profile?.subscription_tier)} Plan
                </Badge>
                <Badge variant="secondary">Member for {daysTracked} days</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Money Saved</p>
                  <p className="text-2xl font-bold text-primary">${totalSaved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Days Tracked</p>
                  <p className="text-2xl font-bold">{daysTracked}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Optimization Score</p>
                  <p className="text-2xl font-bold">{optScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Subscription History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Subscription History
              </CardTitle>
              <CardDescription>Your subscription management timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptions.length === 0 ? <p className="text-muted-foreground">No history yet.</p> : null}
                {subscriptions.map((sub, index) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-lg border bg-card/50 p-4 transition-colors hover:bg-accent"
                  >
                    <div>
                      <p className="font-semibold">{sub.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sub.currency} {sub.cost}/{sub.frequency}
                      </p>
                    </div>
                    <Badge
                      className={
                        sub.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
