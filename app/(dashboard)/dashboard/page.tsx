"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { HealthScoreGauge, OptimizationPanel } from "@/components/financial-health-card"
import { StatCard } from "@/components/quick-stats"
import { SubscriptionsTable } from "@/components/subscriptions-table"
import { SavingsAlerts } from "@/components/savings-alerts"
import { calculateHealthScore } from "@/lib/analytics"
import { formatCurrency, convertCurrency } from "@/lib/utils/currency"
import { getNextRenewalDate, getRenewalDisplay } from "@/lib/utils/date-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Inbox, Bell, Sparkles, Plus, Lock, TrendingUp, AlertTriangle, CheckCircle2, Crown, Shield, Smartphone, DollarSign, Layers, Clock } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { useProfile } from "@/lib/hooks/use-profile"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { connectGmailAccount, getGmailToken } from "@/lib/utils/gmail-auth"
import { scanGmailReceipts } from "@/app/actions/gmail"
import { debugFetchLast5Emails } from "@/app/actions/debug-gmail"
import { GmailImportModal } from "@/components/GmailImportModal"
import { ManualSubscriptionModal } from "@/components/manual-subscription-modal"
import InstallPWAPrompt from "@/components/InstallPWAPrompt"
import { isPro, isFree, isLifetime, getTierDisplayName, getTierLimit } from "@/lib/subscription-utils"
import { TIER_BADGES, TIER_LIMITS } from "@/lib/tier-config"
import { DashboardAIWidget } from "@/components/DashboardAIWidget"
import { ScanSettingsDialog } from "@/components/dashboard/scan-settings-dialog"
import { syncSubscriptionLockStatus } from "@/app/actions/subscription-lock"
import { SubscriptionsProvider } from "@/lib/contexts/subscriptions-context"
import type { UserTier } from "@/lib/types"

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
    const [remainingEmails, setRemainingEmails] = useState<number | null>(null)

    // Review/Import modal state
    const [foundSubscriptions, setFoundSubscriptions] = useState<any[]>([])
    const [isReviewOpen, setIsReviewOpen] = useState(false)

    // Upgrade prompt modal state
    const [showLimitModal, setShowLimitModal] = useState(false)

    // Tier info
    const userTier: UserTier = (profile?.user_tier as UserTier) || 'free'
    const isProUser = isPro(profile?.subscription_tier, profile?.is_pro)
    const tierBadge = TIER_BADGES[userTier]
    const subLimit = getTierLimit(userTier)
    const activeSubCount = subscriptions.filter(s => s.status !== 'cancelled' && s.status !== 'paused' && s.is_enabled !== false).length

    // Free tier limits
    const emailAlertsLimit = profile?.email_alerts_limit ?? TIER_LIMITS.free.emailAlerts
    const alertsExhausted = userTier === 'free' && remainingEmails !== null && remainingEmails <= 0
    const isLimitReached = userTier === 'free' && activeSubCount >= subLimit

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

            // Fetch remaining emails for free users
            if (userTier === 'free' && profile?.id) {
                const supabase = getSupabaseBrowserClient()
                const now = new Date()
                const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

                supabase
                    .from('email_quota_log')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                    .eq('billing_period_start', billingPeriodStart)
                    .in('email_type', ['reminder', 'dunning'])
                    .then(({ count }: { count: number | null }) => {
                        setRemainingEmails(Math.max(0, 3 - (count || 0)))
                    })
            }
        }
    }, [isAuthenticated, refreshProfile, userTier, profile?.id])

    // Sync Lock Status
    useEffect(() => {
        if (profile?.id && subscriptions.length > 0) {
            const timer = setTimeout(() => {
                syncSubscriptionLockStatus(profile.id)
                    .then((res) => {
                        if (res?.updated) {
                            console.log("Locks synced, refreshing subs...");
                            refreshSubscriptions();
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
        const checkout = searchParams.get('checkout')
        const tier = searchParams.get('tier')

        if (error === 'TRUE' && message) {
            console.error('[Dashboard] Auth Error received:', message)
            toast.error("Gmail Connection Failed", {
                description: decodeURIComponent(message),
                duration: 8000,
            })
            router.replace('/dashboard')
        }

        // Handle Stripe upgrade success
        if (success === 'true' || checkout === 'success') {
            const tierName = tier === 'lifetime' ? 'Fortress' : 'Shield'
            toast.success(`Welcome to ${tierName}! 🚀`, {
                description: "Your plan is now active. Enjoy all your new features!",
                duration: 6000,
            })
            refreshProfile()
            router.replace('/dashboard')
        }

        if (success === 'gmail_connected') {
            toast.success("Gmail Connected Successfully!", {
                description: "Scanning your inbox for subscriptions...",
                duration: 5000,
            })
            setIsGmailConnected(true)
            setTimeout(() => {
                handleScanInbox()
            }, 1000)
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
            let token = await getGmailToken()

            if (!token) {
                console.log("[v0] No Gmail token found, initiating OAuth...")
                toast.info("Connecting to Gmail...", { description: "Please approve read-only access to scan for receipts." })
                await connectGmailAccount()
                return
            }

            setFoundSubscriptions([])
            setIsReviewOpen(true)
            console.log("[v0] Token found, scanning inbox...")

            const result = await scanGmailReceipts(token, days, true)

            if (!result.success) {
                console.error("[v0] Scan returned error:", result.error)
                toast.error("Scan failed", { description: result.error || "Could not complete scan." })
                setIsReviewOpen(false)
                return
            }

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

    if (!hasSubscriptions) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
                    {/* Tier Status Widget */}

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Dashboard</h1>
                        <p className="mt-2 text-muted-foreground">
                            {format(new Date(), "EEEE, MMM do")} &bull; No active tracking
                        </p>
                    </div>

                    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/50 p-12 text-center">
                        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-card p-4 shadow-sm ring-1 ring-border">
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
        <div className="overflow-x-hidden bg-background min-h-screen">
            <div className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-6">
                {profile?.id && <InstallPWAPrompt userId={profile.id} />}

                {/* ─── Slim Cancellation Banner ───────────────────── */}
                {profile?.cancellation_scheduled && profile?.cancellation_date && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-400">
                                Subscription ending soon: {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(profile.cancellation_date))}
                                <span className="ml-2 text-amber-600 dark:text-amber-500 font-normal">
                                    ({Math.ceil((new Date(profile.cancellation_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/reactivate?token=' + profile.cancel_reactivation_token}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md font-medium transition-colors text-xs"
                        >
                            Keep Subscription
                        </button>
                    </div>
                )}


                {/* ─── Payment Failure Banner ─────────────────────── */}
                {profile?.payment_error === 'initial_signup_failed' && (
                    <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between dark:bg-red-900/10 dark:border-red-900/30">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-900 dark:text-red-500">Upgrade Payment Failed</h3>
                                <p className="text-sm text-red-700 dark:text-red-600">Your initial payment was declined. Please update your card to unlock Pro features.</p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-none" asChild>
                            <Link href="/pricing">Retry Upgrade</Link>
                        </Button>
                    </div>
                )}

                {/* ─── Alert Exhaustion Banner ─────────────────────── */}
                {alertsExhausted && (
                    <div className="mb-6 rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-center justify-between dark:bg-orange-900/10 dark:border-orange-900/30">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                <Bell className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-orange-900 dark:text-orange-400">
                                    ⚠️ You've used all {emailAlertsLimit} email alerts this month
                                </h3>
                                <p className="text-sm text-orange-700 dark:text-orange-500">
                                    Upgrade to Shield for unlimited alerts and never miss a renewal.
                                </p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white border-none" asChild>
                            <Link href="/pricing">Upgrade Now</Link>
                        </Button>
                    </div>
                )}

                {/* ─── Limit Reached Banner ─────────────────────────── */}
                {isLimitReached && (
                    <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between dark:bg-amber-900/10 dark:border-orange-900/30">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-900 dark:text-foreground">Free Tier Limit Reached</h3>
                                <p className="text-sm text-amber-700 dark:text-foreground">You've reached the {subLimit}-subscription limit. Upgrade to Shield for unlimited tracking.</p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none" asChild>
                            <Link href="/pricing">Upgrade Now</Link>
                        </Button>
                    </div>
                )}

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                            <div className="flex flex-col gap-1">
                                <Badge className={`${tierBadge.className} text-[10px] font-bold uppercase tracking-wider border-0 px-2 py-0.5 w-fit`}>
                                    {userTier}
                                </Badge>
                                {userTier === 'free' && remainingEmails !== null && (
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        📧 {remainingEmails === 0
                                            ? "Email alerts used up for this month. Upgrade for unlimited alerts."
                                            : `${3 - remainingEmails} of 3 email alerts used this month`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Financial Overview &bull; {activeSubCount} Active Subscriptions
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isLimitReached ? (
                            <Button
                                variant="outline"
                                className="gap-2 h-10 px-4"
                                onClick={() => setShowLimitModal(true)}
                            >
                                <Lock className="h-4 w-4" />
                                Add Manually
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
                                    variant="outline"
                                    className={`gap-2 h-10 px-4 ${isGmailConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" : "bg-card shadow-sm"} ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLimitReached ? <Lock className="h-4 w-4 text-muted-foreground" /> : (isGmailConnected ? <CheckCircle2 className="h-4 w-4" /> : (isProUser ? <Inbox className="h-4 w-4" /> : <Lock className="h-4 w-4 text-amber-500" />))}
                                    {isScanning ? "Scanning..." :
                                        isLimitReached ? <span className="text-muted-foreground">Gmail Locked</span> :
                                            isGmailConnected ? "Re-scan Gmail" :
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

                {/* Subscription Limit Modal */}
                <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-amber-500" />
                                Subscription Limit Reached
                            </DialogTitle>
                            <DialogDescription>
                                You're tracking {activeSubCount} subscriptions (Guardian tier limit).
                                You're managing more subscriptions than 68% of users!
                            </DialogDescription>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Upgrade to Shield to track unlimited subscriptions and unlock advanced analytics.
                        </p>
                        <div className="flex gap-3 justify-end mt-2">
                            <Button variant="ghost" onClick={() => setShowLimitModal(false)}>
                                Maybe Later
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                                <Link href="/pricing">Upgrade to Shield — $4.99/mo</Link>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ─── Stats Row ──────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <Card className="border-2 shadow-sm h-full">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <HealthScoreGauge
                                score={subscriptions.filter(s => s.is_enabled !== false).length > 0 ? calculateHealthScore(subscriptions.filter(s => s.is_enabled !== false)) : 0}
                                isLoading={false}
                                size="sm"
                            />
                        </CardContent>
                    </Card>

                    <DashboardStatsCards
                        subscriptions={subscriptions}
                        profile={profile}
                        isLimitReached={isLimitReached}
                        subLimit={subLimit}
                    />
                </div>

                {/* ─── Main Content Row ────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
                    <div className="space-y-4">
                        <SubscriptionsTable />
                    </div>

                    <div className="space-y-4">
                        <OptimizationPanel />

                        {/* Premium Feature Teaser - Only for Free Users */}
                        {!isProUser && (
                            <div className="rounded-xl bg-indigo-600 p-6 text-white shadow-lg">
                                <Shield className="h-8 w-8 mb-4 opacity-50" />
                                <h3 className="font-bold text-lg leading-tight mb-2">Upgrade to Shield</h3>
                                <p className="text-indigo-100 text-sm mb-4">Unlock unlimited tracking, advanced insights, and instant alerts.</p>
                                <Button className="w-full bg-white text-indigo-600 hover:bg-white/90" asChild>
                                    <Link href="/pricing">View Plans</Link>
                                </Button>
                            </div>
                        )}

                        {isProUser && <DashboardAIWidget subscriptions={subscriptions} />}
                    </div>
                </div>
            </div>
        </div >
    )
}

// ─── Stat Helper Components ──────────────────────────────────────────
function DashboardStatsCards({
    subscriptions,
    profile,
    isLimitReached,
    subLimit
}: {
    subscriptions: any[];
    profile: any;
    isLimitReached: boolean;
    subLimit: number;
}) {
    const userCurrency = profile?.default_currency || "USD"
    const totalMonthlySpend = subscriptions.reduce((sum, sub) => {
        if (sub.is_enabled === false || sub.status === 'cancelled' || sub.status === 'paused') return sum
        const converted = convertCurrency(sub.cost, sub.currency, userCurrency)
        return sum + converted
    }, 0)
    const activeCount = subscriptions.filter(s => s.status !== 'cancelled' && s.status !== 'paused' && s.is_enabled !== false).length

    // Find next renewal
    const activeSubsForRenewal = subscriptions.filter(s => s.status !== 'cancelled' && s.status !== 'paused' && s.is_enabled !== false)
    const nextRenewal = activeSubsForRenewal.length > 0
        ? activeSubsForRenewal.reduce((earliest, sub) => {
            const earliestDate = getNextRenewalDate(earliest.renewal_date, earliest.frequency)
            const subDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
            return subDate < earliestDate ? sub : earliest
        })
        : null

    let renewalValue = "None"
    let renewalColor = "text-muted-foreground"
    let countdown = ""

    if (nextRenewal) {
        const nextDate = getNextRenewalDate(nextRenewal.renewal_date, nextRenewal.frequency)
        const { label, statusColor } = getRenewalDisplay(nextDate)
        renewalValue = nextRenewal.name
        renewalColor = statusColor
        countdown = label
    }

    return (
        <>
            <StatCard
                label="Monthly Spend"
                value={formatCurrency(totalMonthlySpend, profile?.default_currency)}
                icon={DollarSign}
                trend="+2.5%"
            />
            <StatCard
                label="Subscriptions"
                value={`${activeCount} / ${subLimit === Infinity ? 'Unlimited' : subLimit}`}
                icon={Layers}
                trend={isLimitReached ? "LIMIT" : null}
            />
            <StatCard
                label="Next Renewal"
                value={renewalValue}
                colorClass={renewalColor === 'text-orange-500' ? 'text-orange-600 font-semibold' : renewalColor}
                icon={Clock}
                trend={countdown}
            />
        </>
    )
}

export default function DashboardPage() {
    return (
        <DashboardContent />
    )
}
