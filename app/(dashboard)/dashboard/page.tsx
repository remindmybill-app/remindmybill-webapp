"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { FinancialHealthCard } from "@/components/financial-health-card"
import { QuickStats } from "@/components/quick-stats"
import { SubscriptionsTable } from "@/components/subscriptions-table"
import { SavingsAlerts } from "@/components/savings-alerts"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Inbox, Bell, Sparkles, Plus, Lock, TrendingUp, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { useProfile } from "@/lib/hooks/use-profile"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { connectGmailAccount, getGmailToken } from "@/lib/utils/gmail-auth"
import { scanGmailReceipts } from "@/app/actions/gmail"
import { debugFetchLast5Emails } from "@/app/actions/debug-gmail"
import { GmailImportModal } from "@/components/GmailImportModal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ManualSubscriptionModal } from "@/components/manual-subscription-modal"
import { isPro } from "@/lib/subscription-utils"
import { CheckCircle2 } from "lucide-react"
import { DashboardAIWidget } from "@/components/DashboardAIWidget"
import { ScanSettingsDialog } from "@/components/dashboard/scan-settings-dialog"
import { syncSubscriptionLockStatus } from "@/app/actions/subscription-lock"
import { SubscriptionsProvider } from "@/lib/contexts/subscriptions-context"

function DashboardContent() {
    const { isAuthenticated, signIn, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { subscriptions, refreshSubscriptions } = useSubscriptions()
    const { profile, refreshProfile } = useProfile()
    const [isScanning, setIsScanning] = useState(false)
    const [scanRange, setScanRange] = useState(45)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)
    const searchParams = useSearchParams()
    const [isGmailConnected, setIsGmailConnected] = useState(false)

    // New state for Review Modal
    const [foundSubscriptions, setFoundSubscriptions] = useState<any[]>([])
    const [isReviewOpen, setIsReviewOpen] = useState(false)


    // Check Gmail connection status on mount and when profile changes
    useEffect(() => {
        const checkGmailStatus = async () => {
            const token = await getGmailToken()
            setIsGmailConnected(!!token)
        }
        checkGmailStatus()
    }, [isAuthenticated, profile])

    // Force profile sync on mount to ensure latest subscription status
    useEffect(() => {
        if (isAuthenticated) {
            refreshProfile()
        }
    }, [isAuthenticated, refreshProfile])

    // Sync Lock Status
    useEffect(() => {
        if (profile?.id && subscriptions.length > 0) {
            const timer = setTimeout(() => {
                syncSubscriptionLockStatus(profile.id)
                    .then((res) => {
                        if (res?.updated) {
                            console.log("Locks synced, refreshing subs...");
                            refreshSubscriptions(); // Refresh to get the new 'is_locked' values
                        }
                    })
                    .catch(err => console.error("Lock sync failed", err));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [profile?.id, subscriptions.length, profile?.subscription_tier, profile?.is_pro]);


    // Handle Post-Sync Success & Error Reporting
    useEffect(() => {
        const error = searchParams.get('error')
        const message = searchParams.get('message')
        const success = searchParams.get('success')

        if (error === 'TRUE' && message) {
            console.error('[Dashboard] Auth Error received:', message)
            toast.error("Gmail Connection Failed", {
                description: decodeURIComponent(message),
                duration: 8000,
            })
            router.replace('/dashboard')
        }

        // Handle Stripe upgrade success - FORCE refresh profile to get is_pro
        if (success === 'true') {
            toast.success("Welcome to Pro! 🚀", {
                description: "Your subscription is now active. Enjoy unlimited features!",
                duration: 6000,
            })
            // Force refresh profile to get the updated is_pro status
            refreshProfile()
            // Clear the success param
            router.replace('/dashboard')
        }

        if (success === 'gmail_connected') {
            toast.success("Gmail Connected Successfully!", {
                description: "Scanning your inbox for subscriptions...",
                duration: 5000,
            })
            setIsGmailConnected(true)

            // Auto-trigger scan
            // We use a small timeout to allow the toast to appear and state to settle
            setTimeout(() => {
                handleScanInbox()
            }, 1000)

            // Clear params
            router.replace('/dashboard')
        }
    }, [searchParams, router, refreshProfile])

    const handleScanInbox = async (days: number = 45) => {
        if (!isPro(profile?.subscription_tier, profile?.is_pro)) {
            router.push('/pricing')
            return
        }

        console.log(`[v0] Starting Gmail Sync flow for last ${days} days...`)
        setScanRange(days)
        setIsScanning(true)

        try {
            // 1. Get Token
            let token = await getGmailToken()

            if (!token) {
                console.log("[v0] No Gmail token found, initiating OAuth...")
                toast.info("Connecting to Gmail...", { description: "Please approve read-only access to scan for receipts." })
                await connectGmailAccount() // This will redirect away
                return
            }

            // Open modal immediately so user sees the "Scanning" state
            // CRITICAL: Reset stale results BEFORE opening modal
            setFoundSubscriptions([])
            setIsReviewOpen(true)
            console.log("[v0] Token found, scanning inbox...")

            // 2. Call Server Action with days and FORCE=true
            const result = await scanGmailReceipts(token, days, true)

            if (!result.success) {
                // Graceful Backend Failure
                console.error("[v0] Scan returned error:", result.error)
                toast.error("Scan failed", { description: result.error || "Could not complete scan." })
                // We keep the modal open? Or close it? 
                // Let's close it if it failed so they can try again.
                setIsReviewOpen(false)
                return
            }

            // 3. Handle Results
            setFoundSubscriptions(result.subs || [])

            if (result.found && result.found > 0) {
                toast.success(`Found ${result.found} emails!`, {
                    description: "Reviewing your recent inbox activity."
                })
            } else {
                toast.info("Scan Complete", { description: "No emails found for the selected time range." })
            }

            setLastSynced(new Date())
        } catch (error: any) {
            // Hard Network/Timeout Failure
            console.error("[v0] Critical scan execution error:", error)
            toast.error("Connection Interrupted", {
                description: "The scan took too long or the connection was lost. Please try again."
            })
            setIsReviewOpen(false)
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
                        <Bell className="h-12 w-12 text-white" />
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
    const isProUser = isPro(profile?.subscription_tier, profile?.is_pro);
    // CRITICAL: Ensure Pro users NEVER hit the limit
    const isLimitReached = !isProUser && subscriptions.length >= 3;

    if (!hasSubscriptions) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-zinc-900 dark:text-zinc-50">Dashboard</h1>
                        <p className="mt-2 text-muted-foreground">
                            {format(new Date(), "EEEE, MMM do")} &bull; No active tracking
                        </p>
                    </div>

                    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 p-12 text-center">
                        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
                            <Sparkles className="h-8 w-8 text-indigo-500" />
                        </div>
                        <h2 className="mb-3 text-xl font-semibold tracking-tight">No active subscriptions found.</h2>
                        <p className="mb-8 max-w-sm text-muted-foreground">
                            Add your first one to start tracking your recurring expenses and optimization potential.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                            <ScanSettingsDialog
                                onScan={handleScanInbox}
                                isScanning={isScanning}
                                trigger={
                                    <Button
                                        disabled={isScanning}
                                        size="lg"
                                        className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 h-12 text-md shadow-lg shadow-indigo-500/20"
                                    >
                                        {isProUser ? <Inbox className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                                        {isScanning ? "Scanning Gmail..." :
                                            isGmailConnected ? "Re-scan Gmail" :
                                                isProUser ? "Connect Gmail" : "Connect Gmail (Pro)"}
                                    </Button>
                                }
                            />

                            <ManualSubscriptionModal onSubscriptionAdded={refreshSubscriptions} />
                        </div>
                        <p className="mt-6 text-xs text-muted-foreground max-w-xs mx-auto">
                            {isGmailConnected ? (
                                <span className="flex items-center justify-center gap-1 text-emerald-600 font-medium">
                                    <CheckCircle2 className="h-3 w-3" /> Gmail Account Linked
                                </span>
                            ) : (
                                "We use read-only permissions to find receipts. Your data is never sold."
                            )}
                        </p>
                    </div>
                </div>

                <GmailImportModal
                    isOpen={isReviewOpen}
                    onClose={() => setIsReviewOpen(false)}
                    foundSubscriptions={foundSubscriptions}
                    onImportComplete={() => {
                        refreshSubscriptions()
                        setFoundSubscriptions([])
                    }}
                    onRescan={handleScanInbox}
                    isScanning={isScanning}
                    range={scanRange}
                />
            </div>
        )
    }

    return (
        <div className="overflow-x-hidden bg-zinc-50/50 dark:bg-black min-h-screen">
            <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">

                {/* Limit Reached Banner */}
                {isLimitReached && (
                    <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between dark:bg-amber-900/10 dark:border-amber-900/30">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-900 dark:text-amber-500">Free Tier Limit Reached</h3>
                                <p className="text-sm text-amber-700 dark:text-amber-600">You have reached the 3-subscription limit. Upgrade to Pro to track unlimited subscriptions.</p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none" asChild>
                            <Link href="/pricing">Upgrade Now</Link>
                        </Button>
                    </div>
                )}

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Dashboard</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Financial Overview &bull; {subscriptions.length} Active Subscriptions
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isLimitReached ? (
                            <Button variant="outline" disabled className="gap-2 opacity-50 cursor-not-allowed">
                                <Lock className="h-4 w-4" />
                                Add Subscription
                            </Button>
                        ) : (
                            <ManualSubscriptionModal onSubscriptionAdded={refreshSubscriptions} />
                        )}

                        <ScanSettingsDialog
                            onScan={handleScanInbox}
                            isScanning={isScanning}
                            trigger={
                                <Button
                                    disabled={isScanning || isLimitReached}
                                    variant={isGmailConnected ? "outline" : "outline"}
                                    className={`gap-2 ${isGmailConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" : "bg-white dark:bg-zinc-900"} ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isGmailConnected ? <CheckCircle2 className="h-4 w-4" /> : (isProUser ? <Inbox className="h-4 w-4" /> : <Lock className="h-4 w-4 text-amber-500" />)}
                                    {isScanning ? "Scanning..." :
                                        isLimitReached ? "Gmail Locked" :
                                            isGmailConnected ? "Re-scan Inbox" :
                                                isProUser ? "Sync Gmail" : "Sync Gmail (Pro)"}
                                </Button>
                            }
                        />
                    </div>


                </div>

                {/* Review Modal for Found Subscriptions */}
                <GmailImportModal
                    isOpen={isReviewOpen}
                    onClose={() => setIsReviewOpen(false)}
                    foundSubscriptions={foundSubscriptions}
                    onImportComplete={() => {
                        refreshSubscriptions()
                        setFoundSubscriptions([])
                    }}
                    onRescan={handleScanInbox}
                    isScanning={isScanning}
                    range={scanRange}
                />

                <div className="grid w-full gap-6 xl:grid-cols-[1fr_380px]">
                    <div className="w-full space-y-6">
                        <div className="grid w-full gap-6 md:grid-cols-1 lg:grid-cols-[420px_1fr]">
                            <FinancialHealthCard />
                            <QuickStats />
                        </div>

                        <SubscriptionsTable />
                    </div>

                    <div className="w-full xl:sticky xl:top-8 xl:h-fit space-y-6">
                        {/* <SavingsAlerts /> */}

                        {/* Premium Feature Teaser */}
                        {/* Premium Feature Teaser - Only for Free Users */}
                        {!isProUser && (
                            <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-500/20">
                                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                                    <Bell className="h-5 w-5 text-white" />
                                </div>
                                <h3 className="mb-2 text-lg font-bold">Remind My Bill Premium</h3>
                                <p className="mb-4 text-sm text-indigo-100">
                                    Get Legal Concierge to cancel hard-to-cancel subscriptions for you.
                                </p>
                                <Button variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-indigo-50" asChild>
                                    <Link href="/pricing">Upgrade Plan</Link>
                                </Button>
                            </div>
                        )}

                        {/* AI Portfolio Insights Widget */}
                        {isProUser && (
                            <DashboardAIWidget subscriptions={subscriptions} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <SubscriptionsProvider>
            <DashboardContent />
        </SubscriptionsProvider>
    )
}
