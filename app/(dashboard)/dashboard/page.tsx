"use client"

import { useState, useEffect } from "react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Inbox, Bell, Sparkles, Plus, Lock, TrendingUp, AlertTriangle, CheckCircle2, Crown, Shield, Smartphone, DollarSign, Layers, Clock, X } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { useProfile } from "@/lib/hooks/use-profile"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { connectGmailAccount, getGmailToken } from "@/lib/utils/gmail-auth"
import { scanGmailReceipts, disconnectGmailAccount } from "@/app/actions/gmail"
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

// ─── Welcome Banner ──────────────────────────────────────────────────────────
function WelcomeBanner({ profile, subscriptionCount }: { profile: any; subscriptionCount: number }) {
    const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash

    useEffect(() => {
        const wasDismissed = localStorage.getItem('welcome_dismissed') === 'true'
        if (!wasDismissed) setDismissed(false)
    }, [])

    if (dismissed || subscriptionCount > 0 || !profile?.created_at) return null

    // Only show if account is less than 3 days old
    const createdAt = new Date(profile.created_at)
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated >= 3) return null

    const handleDismiss = () => {
        setDismissed(true)
        localStorage.setItem('welcome_dismissed', 'true')
    }

    return (
        <div className="bg-primary/10 border border-primary/20 text-foreground rounded-lg p-4 mb-6 flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm font-medium">
                👋 Welcome to RemindMyBill! Start by adding your first subscription below. We&apos;ll remind you before every renewal.
            </p>
            <button
                onClick={handleDismiss}
                className="shrink-0 rounded-md p-1 hover:bg-primary/10 transition-colors"
                aria-label="Dismiss welcome banner"
            >
                <X className="h-4 w-4 text-muted-foreground" />
            </button>
        </div>
    )
}

function DashboardContent() {
    const { isAuthenticated, signIn, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { subscriptions, refreshSubscriptions, isLoading: subsLoading } = useSubscriptions()
    const { profile, refreshProfile, updateProfile } = useProfile()
    const [isScanning, setIsScanning] = useState(false)
    const [scanRange, setScanRange] = useState(45)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)
    const searchParams = useSearchParams()
    const [isGmailConnected, setIsGmailConnected] = useState(false)
    const [remainingEmails, setRemainingEmails] = useState<number | null>(null)
    const [prevSubCount, setPrevSubCount] = useState<number | null>(null)
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
    const [isDisconnectingGmail, setIsDisconnectingGmail] = useState(false)

    // Review/Import modal state
    const [foundSubscriptions, setFoundSubscriptions] = useState<any[]>([])
    const [isReviewOpen, setIsReviewOpen] = useState(false)

    // Upgrade prompt modal state
    const [showLimitModal, setShowLimitModal] = useState(false)

    // Flow states
    const [showMiniCelebration, setShowMiniCelebration] = useState(false)
    const [showNudgeBanner, setShowNudgeBanner] = useState(false)
    const [showGmailNudge, setShowGmailNudge] = useState(false)

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
            setIsGmailConnected(!!token || !!profile?.gmail_linked)
        }
        checkGmailStatus()
    }, [isAuthenticated, profile])

    // Force profile sync on mount to ensure latest subscription status
    useEffect(() => {
        if (isAuthenticated) {
            refreshProfile()

            // Fetch remaining emails for free users
            if (userTier === 'free') {
                fetch('/api/user/email-quota')
                    .then(res => res.json())
                    .then(data => {
                        if (data.remaining !== undefined) {
                            setRemainingEmails(data.remaining)
                        }
                    })
                    .catch(err => console.error("Failed to fetch email quota:", err))
            }
        }
    }, [isAuthenticated, refreshProfile, userTier, profile?.id])

    // Background Auto-Scan logic
    useEffect(() => {
        if (!isAuthenticated || !profile || subsLoading) return;

        if (profile.gmail_linked && !isScanning) {
            const lastScanStr = profile.last_gmail_scan_at;
            let shouldScan = false;
            
            if (!lastScanStr) {
                 shouldScan = true;
            } else {
                 const lastScan = new Date(lastScanStr);
                 const hoursSinceLastScan = (Date.now() - lastScan.getTime()) / (1000 * 60 * 60);
                 if (hoursSinceLastScan >= 24) shouldScan = true;
            }

            if (shouldScan) {
                // Instantly update DB to prevent trigger loop
                updateProfile({ last_gmail_scan_at: new Date().toISOString() });

                // Silent background scan
                getGmailToken().then(token => {
                     if (token) {
                          scanGmailReceipts(token, 45, true).then(result => {
                               if (result.success && result.found && result.found > 0) {
                                    setFoundSubscriptions(result.subs || []);
                                    setIsReviewOpen(true);
                                    toast.success(`Gmail scanned — ${result.found} new subscriptions found`, {
                                         description: "Reviewing your recent inbox activity."
                                    });
                                    setLastSynced(new Date());
                               }
                          }).catch(err => console.error("Auto scan background error:", err));
                     }
                }).catch(err => console.error("Failed getting gmail token for background scan:", err));
            }
        }
    }, [profile?.id, profile?.gmail_linked, profile?.last_gmail_scan_at, isAuthenticated, subsLoading]);

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

    // ─── First Subscription Toast & Post-Onboarding Nudges ─────────────
    useEffect(() => {
        // Nudge banner logic
        const firstSubDate = localStorage.getItem('rmb_first_sub_date')
        if (firstSubDate && subscriptions.length > 0) {
            const timeDiff = Date.now() - parseInt(firstSubDate)
            const daysSinceFirstSub = timeDiff / (1000 * 60 * 60 * 24)
            if (daysSinceFirstSub <= 7) {
                setShowNudgeBanner(true)
            }
        }

        // First Subscription Toast logic
        if (!subsLoading && subscriptions.length === 1 && prevSubCount === 0) {
            const alreadyShown = localStorage.getItem('rmb_first_sub_added') === 'true'
            if (!alreadyShown) {
                const sub = subscriptions[0]
                const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
                const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(nextDate)

                toast.success(`✅ Perfect! "${sub.name}" added successfully.`, {
                    description: `You'll get a reminder 3 days before it renews on ${dateStr}.`,
                    duration: 6000
                })
                
                localStorage.setItem('rmb_first_sub_added', 'true')
                localStorage.setItem('rmb_first_sub_date', Date.now().toString())
                
                setTimeout(() => {
                    setShowMiniCelebration(true)
                }, 3000)
            }
        }
        if (!subsLoading) {
            setPrevSubCount(subscriptions.length)
        }
    }, [subscriptions, prevSubCount, subsLoading]);

    // ─── One-Time Gmail Sync Nudge ─────────────────────────────────────
    useEffect(() => {
        if (subsLoading || !profile) return
        
        const hasGmailConnected = isGmailConnected || !!profile.google_refresh_token
        
        if (
            subscriptions.length <= 1 && 
            !hasGmailConnected && 
            localStorage.getItem('rmb_gmail_nudge_shown') !== 'true'
        ) {
            setShowGmailNudge(true)
            
            const timer = setTimeout(() => {
                setShowGmailNudge(false)
                localStorage.setItem('rmb_gmail_nudge_shown', 'true')
            }, 10000)
            
            return () => clearTimeout(timer)
        }
    }, [subscriptions.length, profile, subsLoading, isGmailConnected])

    const dismissGmailNudge = () => {
        setShowGmailNudge(false)
        localStorage.setItem('rmb_gmail_nudge_shown', 'true')
    }

    const handleConnectGmailFromNudge = () => {
        dismissGmailNudge()
        handleScanInbox()
    }

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
            const tierName = tier === 'lifetime' ? 'Lifetime' : 'Pro'
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

    const handleDisconnectGmail = async () => {
        setIsDisconnectingGmail(true)
        try {
            await disconnectGmailAccount()
            await refreshProfile()
            toast.success("Gmail disconnected — your subscriptions have been kept")
            setShowDisconnectDialog(false)
            setIsGmailConnected(false)
        } catch (e) {
            toast.error("Failed to disconnect Gmail")
        } finally {
            setIsDisconnectingGmail(false)
        }
    }

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
                if (profile?.gmail_linked) {
                    toast.error("Gmail connection expired — please reconnect", {
                        action: {
                            label: "Reconnect",
                            onClick: () => connectGmailAccount()
                        }
                    })
                    setIsScanning(false)
                    return
                }

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
                toast.success(`Gmail scanned — ${result.found} new subscriptions found`, {
                    description: "Reviewing your recent inbox activity."
                })
            } else {
                toast.success("Gmail scanned — nothing new found", { description: "No emails found for the selected time range." })
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

    return (
        <div className="overflow-x-hidden bg-background min-h-screen">
            <div className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-6">
                {profile?.id && <InstallPWAPrompt userId={profile.id} />}

                {/* ─── Welcome Banner (new users only) ────────────── */}
                <WelcomeBanner profile={profile} subscriptionCount={subscriptions.length} />

                {/* ─── Nudge Banner ────────────────────────────────────── */}
                {showNudgeBanner && (
                    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-indigo-50 border-2 border-indigo-200 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-indigo-950/20 dark:border-indigo-900/50 rounded-2xl p-6 mb-8 animate-in fade-in zoom-in-95 duration-500 shadow-sm">
                        <div className="absolute -right-10 -top-10 h-32 w-32 bg-indigo-500/10 blur-3xl rounded-full" />
                        <h3 className="font-bold text-lg text-indigo-950 dark:text-indigo-200 mb-4 flex items-center gap-2 tracking-tight">
                           <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Great start! Your first subscription is tracking perfectly.
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           <Link href="/analytics" className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm">
                               <div className="text-xl">📊</div>
                               <div>
                                   <p className="font-bold text-sm text-indigo-900 dark:text-indigo-100">Check Analytics</p>
                                   <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 leading-snug">See spending patterns (Pro)</p>
                               </div>
                           </Link>
                           <Link href="/trust-center" className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm">
                               <div className="text-xl">🛡️</div>
                               <div>
                                   <p className="font-bold text-sm text-indigo-900 dark:text-indigo-100">Trust Center</p>
                                   <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 leading-snug">Cancellation difficulty</p>
                               </div>
                           </Link>
                           <Link href="/settings" className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm">
                               <div className="text-xl">📧</div>
                               <div>
                                   <p className="font-bold text-sm text-indigo-900 dark:text-indigo-100">Verify Emails</p>
                                   <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 leading-snug">Check spam for reminders</p>
                               </div>
                           </Link>
                        </div>
                    </div>
                )}

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
                                    Upgrade to Pro for unlimited alerts and never miss a renewal.
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
                                <p className="text-sm text-amber-700 dark:text-foreground">You've reached the {subLimit}-subscription limit. Upgrade to Pro for unlimited tracking.</p>
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
                                    {tierBadge.label}
                                </Badge>
                                {userTier === 'free' && remainingEmails !== null && (
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        {remainingEmails === 0
                                            ? "📧 No email alerts left this month — Upgrade for unlimited"
                                            : `📧 ${3 - remainingEmails} of 3 email alerts used this month`}
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

                        <div className="relative flex flex-col items-end">
                            {isGmailConnected ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            disabled={isScanning || isLimitReached}
                                            variant="outline"
                                            className={`gap-2 h-10 px-4 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            {isScanning ? "Scanning..." : "Gmail Connected"}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {isProUser ? (
                                            <DropdownMenuItem onClick={() => handleScanInbox()} className="cursor-pointer">
                                                <Inbox className="mr-2 h-4 w-4" />
                                                <span>Re-scan Gmail</span>
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed" title="Manual re-scan is a Pro feature — upgrade to use it">
                                                <Lock className="mr-2 h-4 w-4 text-amber-500" />
                                                <span>Re-scan Gmail (Pro)</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => setShowDisconnectDialog(true)} className="text-destructive cursor-pointer">
                                            <X className="mr-2 h-4 w-4" />
                                            <span>Disconnect Gmail</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <ScanSettingsDialog
                                    onScan={handleScanInbox}
                                    isScanning={isScanning}
                                    trigger={
                                        <Button
                                            disabled={isScanning || isLimitReached}
                                            variant="outline"
                                            onClick={showGmailNudge ? dismissGmailNudge : undefined}
                                            className={`gap-2 h-10 px-4 bg-card shadow-sm ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''} ${showGmailNudge ? 'ring-2 ring-emerald-400 animate-pulse rounded-lg' : ''}`}
                                        >
                                            <Inbox className="h-4 w-4" />
                                            {isScanning ? "Scanning..." : (isLimitReached ? "Gmail Locked" : (isProUser ? "Sync Gmail" : "Sync Gmail (Pro)"))}
                                        </Button>
                                    }
                                />
                            )}
                            
                            {isGmailConnected && (
                                <p className="text-xs text-muted-foreground mt-1 mr-1">
                                    Last scanned: {profile?.last_gmail_scan_at ? `${Math.floor((Date.now() - new Date(profile.last_gmail_scan_at).getTime()) / (1000 * 60 * 60))} hours ago` : "Never scanned"}
                                </p>
                            )}
                            
                            {showGmailNudge && !isGmailConnected && (
                                <div className="absolute top-[calc(100%+12px)] right-0 w-72 z-50 glass-panel bg-card border border-emerald-500/50 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="absolute -top-[5px] right-6 w-2.5 h-2.5 bg-card border-t border-l border-emerald-500/50 rotate-45 transform origin-center rounded-[1px]" />
                                    
                                    <div className="relative z-10 flex flex-col gap-2">
                                        <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                            💡 Save time — sync Gmail
                                        </h4>
                                        <p className="text-sm text-muted-foreground leading-snug">
                                            Auto-import subscriptions from your email receipts.
                                            No manual entry needed. Takes 10 seconds.
                                        </p>
                                        <div className="flex items-center justify-end gap-2 mt-2 transition-colors">
                                            <Button variant="ghost" size="sm" onClick={dismissGmailNudge} className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
                                                Maybe later
                                            </Button>
                                            <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConnectGmailFromNudge}>
                                                Connect Gmail
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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

                {/* Limit Hit Upgrade Prompt */}
                <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
                    <DialogContent className="max-w-md bg-background border-border text-foreground p-0 overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl">
                        <div className="bg-gradient-to-b from-blue-500/10 to-transparent p-8 text-center">
                            <DialogHeader>
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                    <Sparkles className="h-8 w-8" />
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Track more, save more!</DialogTitle>
                                <DialogDescription className="text-muted-foreground font-bold text-sm mt-1 text-center">
                                    You&apos;ve reached the <span className="text-blue-600 dark:text-blue-400">5 subscription limit</span> on the Free plan. Upgrade to Pro for unlimited tracking and advanced analytics.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        
                        <div className="px-8 pb-8 flex flex-col gap-3">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest h-14 rounded-2xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]" asChild>
                                <Link href="/pricing">Upgrade to Pro &mdash; $4.99/mo</Link>
                            </Button>
                            <Button variant="ghost" onClick={() => setShowLimitModal(false)} className="text-muted-foreground font-heavy h-12 hover:text-foreground">
                                Maybe Later
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Disconnect Gmail Modal */}
                <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Disconnect Gmail?</DialogTitle>
                            <DialogDescription>
                                We'll stop scanning your inbox for new subscriptions. Your existing subscriptions will not be deleted.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)} disabled={isDisconnectingGmail}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDisconnectGmail} disabled={isDisconnectingGmail}>
                                {isDisconnectingGmail ? "Disconnecting..." : "Disconnect"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Celebration Mini-Modal */}
                <Dialog open={showMiniCelebration} onOpenChange={setShowMiniCelebration}>
                    <DialogContent className="max-w-md bg-background border-border text-foreground p-0 overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="bg-gradient-to-b from-emerald-500/10 to-transparent pt-10 pb-6 px-8 text-center shrink-0">
                            <DialogHeader>
                                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                                    <span className="text-4xl">🎉</span>
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tight text-center text-foreground">Tracking Started!</DialogTitle>
                                <DialogDescription className="text-center text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-1">
                                    Your first subscription is now fully monitored.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        
                        <div className="px-8 pb-8 text-left overflow-y-auto">
                            <p className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-4">Your Next Actions</p>
                            <div className="space-y-3 mb-8">
                                <Link href="/dashboard" onClick={() => setShowMiniCelebration(false)} className="group flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all">
                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg">✅</div>
                                    <div>
                                        <p className="font-bold text-sm group-hover:text-emerald-600 transition-colors">Review Dashboard</p>
                                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">See your spend update live</p>
                                    </div>
                                </Link>
                                <Link href="/analytics" className="group flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all">
                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 text-lg">📊</div>
                                    <div>
                                        <p className="font-bold text-sm group-hover:text-blue-600 transition-colors">Unlock Analytics (Pro)</p>
                                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">View spending trends & forecasts</p>
                                    </div>
                                </Link>
                                <Link href="/trust-center" className="group flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all">
                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 text-lg">🛡️</div>
                                    <div>
                                        <p className="font-bold text-sm group-hover:text-indigo-600 transition-colors">Explore Trust Center</p>
                                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Check cancellation guides</p>
                                    </div>
                                </Link>
                            </div>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest h-14 rounded-2xl text-base shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]" onClick={() => setShowMiniCelebration(false)}>
                                Let&apos;s Go
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
                        <SubscriptionsTable onScanGmail={handleScanInbox} />
                    </div>

                    <div className="space-y-4">
                        <OptimizationPanel />

                        {/* Premium Feature Teaser - Only for Free Users */}
                        {!isProUser && (
                            <div className="rounded-xl bg-indigo-600 dark:bg-indigo-900/40 p-6 text-white shadow-lg border border-indigo-500/20">
                                <Shield className="h-8 w-8 mb-4 opacity-50" />
                                <h3 className="font-bold text-lg leading-tight mb-2">Upgrade to Pro</h3>
                                <p className="text-indigo-100 text-sm mb-4">Unlock unlimited tracking, advanced insights, and instant alerts.</p>
                                <Button className="w-full bg-white text-indigo-600 hover:bg-white/90 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-400" asChild>
                                    <Link href="/pricing">View Plans</Link>
                                </Button>
                            </div>
                        )}

                        {isProUser && <DashboardAIWidget subscriptions={subscriptions} />}
                    </div>
                </div>

                {/* ─── Smart Next Actions Bar ─────────────────────── */}
                {!isProUser && activeSubCount >= 1 && activeSubCount < 5 && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 animate-in slide-in-from-bottom">
                        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm tracking-tight">✅ {activeSubCount}/5 subscriptions added</p>
                                    <p className="text-xs text-muted-foreground">Keep going! Add all your recurring expenses.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap flex-1 justify-end items-center gap-2 shrink-0 max-w-full overflow-hidden">
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-2 hidden md:inline-block">Next:</span>
                                <ManualSubscriptionModal 
                                    onSubscriptionAdded={refreshSubscriptions} 
                                    trigger={<Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-full whitespace-nowrap">Add another subscription</Button>}
                                />
                                <Button size="sm" variant="secondary" className="h-9 rounded-full hidden sm:inline-flex whitespace-nowrap" asChild><Link href="/analytics">View Analytics (Pro)</Link></Button>
                                <Button size="sm" variant="secondary" className="h-9 rounded-full hidden sm:inline-flex whitespace-nowrap" asChild><Link href="/trust-center">Trust Center</Link></Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
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

    let renewalValue = "—"
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
