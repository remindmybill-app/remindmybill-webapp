
"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { FinancialHealthCard } from "@/components/financial-health-card"
import { QuickStats } from "@/components/quick-stats"
import { SubscriptionsTable } from "@/components/subscriptions-table"
import { SavingsAlerts } from "@/components/savings-alerts"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Inbox, Bell, Sparkles, Plus, Lock, TrendingUp } from "lucide-react"
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

export default function DashboardPage() {
    const { isAuthenticated, signIn, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { subscriptions, refreshSubscriptions } = useSubscriptions()
    const { profile, refreshProfile } = useProfile()
    const [isScanning, setIsScanning] = useState(false)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)
    const searchParams = useSearchParams()
    const [isGmailConnected, setIsGmailConnected] = useState(false)

    // New state for Review Modal
    const [foundSubscriptions, setFoundSubscriptions] = useState<any[]>([])
    const [isReviewOpen, setIsReviewOpen] = useState(false)

    // Debug State
    const [isDebugOpen, setIsDebugOpen] = useState(false)
    const [debugData, setDebugData] = useState<any>(null)
    const [isDebugLoading, setIsDebugLoading] = useState(false)

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
    }, [searchParams, router])

    const handleScanInbox = async () => {
        if (!isPro(profile?.subscription_tier)) {
            router.push('/pricing')
            return
        }

        console.log("[v0] Starting Gmail Sync flow...")
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

            console.log("[v0] Token found, scanning inbox...")

            // 2. Call Server Action
            const result = await scanGmailReceipts(token)

            if (!result.success) {
                console.error("[v0] Error scanning inbox:", result.error)
                throw new Error(result.error)
            }

            // 3. Handle Results
            if (result.count > 0) {
                toast.success(`✨ Added ${result.count} new subscriptions!`, {
                    description: "High-confidence receipts were automatically added to your dashboard."
                })
                refreshSubscriptions()
            } else if (result.found > 0) {
                setFoundSubscriptions(result.subs)
                setIsReviewOpen(true)
                toast.success(`Found ${result.found} potential subscriptions!`, {
                    description: "Please review them to add to your dashboard."
                })
            } else {
                if (result.scanned && result.scanned > 0) {
                    toast.info("Scan Complete", {
                        description: `Scanned ${result.scanned} emails. No subscriptions found. Try sending a receipt with 'Invoice' in the subject.`
                    })
                } else {
                    toast.info("Scan Complete", { description: "No new subscription receipts found in your recent emails." })
                }
            }

            setLastSynced(new Date())
        } catch (error: any) {
            console.error("[v0] Failed to scan inbox:", error)
            toast.error("Sync failed", {
                description: "Could not scan inbox. Please try reconnecting Gmail."
            })
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
                            <Button
                                onClick={handleScanInbox}
                                disabled={isScanning}
                                size="lg"
                                className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700 h-12 text-md shadow-lg shadow-indigo-500/20"
                            >
                                {isPro(profile?.subscription_tier) ? <Inbox className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                                {isScanning ? "Scanning Gmail..." :
                                    isGmailConnected ? "Re-scan Gmail" :
                                        isPro(profile?.subscription_tier) ? "Connect Gmail" : "Connect Gmail (Pro)"}
                            </Button>

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
                />
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
                        <Button
                            onClick={handleScanInbox}
                            disabled={isScanning}
                            variant={isGmailConnected ? "outline" : "outline"}
                            className={`gap-2 ${isGmailConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" : "bg-white dark:bg-zinc-900"}`}
                        >
                            {isGmailConnected ? <CheckCircle2 className="h-4 w-4" /> : (isPro(profile?.subscription_tier) ? <Inbox className="h-4 w-4" /> : <Lock className="h-4 w-4 text-amber-500" />)}
                            {isScanning ? "Scanning..." :
                                isGmailConnected ? "Re-scan Inbox" :
                                    isPro(profile?.subscription_tier) ? "Sync Gmail" : "Sync Gmail (Pro)"}
                        </Button>
                    </div>


                    {/* Debug Button (Bottom Left or temporarily visible) */}
                    {isGmailConnected && (
                        <div className="mt-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                    setIsDebugOpen(true)
                                    setIsDebugLoading(true)
                                    const token = await getGmailToken()
                                    if (token) {
                                        const res = await debugFetchLast5Emails(token)
                                        setDebugData(res)
                                    }
                                    setIsDebugLoading(false)
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                🐞 Debug Gmail
                            </Button>
                        </div>
                    )}

                    {/* Debug Modal */}
                    <Dialog open={isDebugOpen} onOpenChange={setIsDebugOpen}>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Gmail Debugger</DialogTitle>
                                <DialogDescription>Raw fetch of last 5 emails (No filters)</DialogDescription>
                            </DialogHeader>
                            <div className="bg-zinc-950 text-zinc-50 p-4 rounded-md font-mono text-xs whitespace-pre-wrap overflow-auto">
                                {isDebugLoading ? "Fetching raw data..." : JSON.stringify(debugData, null, 2)}
                            </div>
                        </DialogContent>
                    </Dialog>
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
                        {!isPro(profile?.subscription_tier) && (
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

                        {/* Smart Alert / Forecast Card */}
                        {isPro(profile?.subscription_tier) && (
                            <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-white shadow-xl shadow-zinc-500/10 dark:from-zinc-800 dark:to-zinc-900">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300 backdrop-blur-sm">
                                        Forecast
                                    </span>
                                </div>
                                <h3 className="mb-1 text-lg font-bold">Monthly Forecast</h3>
                                <p className="mb-4 text-sm text-zinc-400">
                                    Based on your active subscriptions, your next month's bill is estimated to be <span className="text-white font-bold">${subscriptions.reduce((acc, sub) => acc + sub.cost, 0).toFixed(2)}</span>.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
