
"use client"

import { useState } from "react"
import { FinancialHealthCard } from "@/components/financial-health-card"
import { QuickStats } from "@/components/quick-stats"
import { SubscriptionsTable } from "@/components/subscriptions-table"
import { SavingsAlerts } from "@/components/savings-alerts"
import { Button } from "@/components/ui/button"
import { Inbox, Shield, Sparkles, Plus } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ManualSubscriptionModal } from "@/components/manual-subscription-modal"
import Link from "next/link"

export default function DashboardPage() {
    const { isAuthenticated, signIn, isLoading: authLoading } = useAuth()
    const { subscriptions, refreshSubscriptions } = useSubscriptions()
    const [isScanning, setIsScanning] = useState(false)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)

    const handleScanInbox = async () => {
        console.log("[v0] Scanning inbox for subscriptions...")
        setIsScanning(true)

        try {
            const supabase = getSupabaseBrowserClient()

            const { data, error } = await supabase.functions.invoke("scan-inbox", {
                body: { action: "scan" },
            })

            if (error) {
                console.error("[v0] Error scanning inbox:", error)
                throw error
            }

            console.log("[v0] Inbox scan complete:", data)
            setLastSynced(new Date())
            refreshSubscriptions()
        } catch (error) {
            console.error("[v0] Failed to scan inbox:", error)
        } finally {
            setIsScanning(false)
        }
    }

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading secure dashboard...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-md text-center">
                    <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-zinc-900 p-6 ring-1 ring-white/10">
                        <Shield className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold tracking-tight">Security Check</h1>
                    <p className="mb-6 text-muted-foreground">Please sign in to access your financial dashboard.</p>
                    <Button size="lg" onClick={signIn} className="w-full gap-2">
                        Sign In
                    </Button>
                </div>
            </div>
        )
    }

    const hasSubscriptions = subscriptions.length > 0

    if (!hasSubscriptions) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-zinc-900 dark:text-zinc-50">Dashboard</h1>
                        <p className="mt-2 text-muted-foreground">
                            Monday, Jan 1st • No active tracking
                        </p>
                    </div>

                    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 p-12 text-center">
                        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
                            <Sparkles className="h-8 w-8 text-indigo-500" />
                        </div>
                        <h2 className="mb-3 text-xl font-semibold tracking-tight">No active subscriptions found.</h2>
                        <p className="mb-8 max-w-md text-muted-foreground">
                            Add your first one to start tracking your recurring expenses and optimization potential.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                            <Button onClick={handleScanInbox} disabled={isScanning} size="lg" className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 h-12 text-md shadow-lg shadow-indigo-500/20">
                                <Inbox className="h-5 w-5" />
                                {isScanning ? "Scanning Gmail..." : "Connect Gmail"}
                            </Button>

                            <ManualSubscriptionModal onSubscriptionAdded={refreshSubscriptions} />
                        </div>
                        <p className="mt-6 text-xs text-muted-foreground max-w-xs mx-auto">
                            We use read-only permissions to find receipts. Your data is never sold.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="overflow-x-hidden bg-zinc-50/50 dark:bg-black min-h-screen">
            <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Dashboard</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Financial Overview &bull; {subscriptions.length} Active Subscriptions
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ManualSubscriptionModal onSubscriptionAdded={refreshSubscriptions} />
                        <Button onClick={handleScanInbox} disabled={isScanning} variant="outline" className="gap-2 bg-white dark:bg-zinc-900">
                            <Inbox className="h-4 w-4" />
                            {isScanning ? "Syncing..." : "Sync Gmail"}
                        </Button>
                    </div>
                </div>

                <div className="grid w-full gap-6 xl:grid-cols-[1fr_380px]">
                    <div className="w-full space-y-6">
                        <div className="grid w-full gap-6 md:grid-cols-1 lg:grid-cols-[420px_1fr]">
                            <FinancialHealthCard />
                            <QuickStats />
                        </div>

                        <SubscriptionsTable />
                    </div>

                    <div className="w-full xl:sticky xl:top-8 xl:h-fit space-y-6">
                        <SavingsAlerts />

                        {/* Premium Feature Teaser */}
                        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-500/20">
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="mb-2 text-lg font-bold">SubGuard Premium</h3>
                            <p className="mb-4 text-sm text-indigo-100">
                                Get Legal Concierge to cancel hard-to-cancel subscriptions for you.
                            </p>
                            <Button variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-indigo-50">
                                Upgrade Plan
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
