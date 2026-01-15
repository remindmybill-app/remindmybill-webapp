
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell, Sparkles, Inbox, Lock, ArrowRight, CheckCircle2, Zap, Eye, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useEffect, useState } from "react"

export default function LandingPage() {
    const { user, isLoading } = useAuth()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Prevent hydration mismatch for auth state if needed, though useAuth should be stable.
    // We'll trust useAuth to handle initial loading state.

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground font-sans selection:bg-primary/20">

            {/* Hero Section */}
            <header className="relative overflow-hidden pt-12 pb-24 md:pt-32 lg:pt-40 lg:pb-32">
                <div className="absolute top-0 -z-10 h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

                <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-8 flex justify-center">
                            <div className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
                                Reclaim your financial freedom
                            </div>
                        </div>
                        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                            Finally, an inbox that <br className="hidden sm:block" />
                            <span className="text-primary">pays for itself.</span>
                        </h1>
                        <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                            I built Remind My Bill because I was tired of losing money to "free" trials and hidden subscriptions.
                            Our AI scans your receipts, finds the leaks, and helps you cancel the noise.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                            {/* Intelligent Start Button */}
                            {isLoading ? (
                                <Button size="lg" disabled className="w-full sm:w-auto h-12 gap-2 px-8 text-lg">
                                    Loading...
                                </Button>
                            ) : user ? (
                                <Link href="/dashboard" className="w-full sm:w-auto">
                                    <Button size="lg" className="w-full sm:w-auto h-12 gap-2 px-8 text-lg shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40">
                                        Go to Dashboard <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            ) : (
                                <Link href="/auth/login" className="w-full sm:w-auto">
                                    <Button size="lg" className="w-full sm:w-auto h-12 gap-2 px-8 text-lg shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40">
                                        Get Started <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            )}

                            <Link href="#features" className="text-sm font-semibold leading-6 hover:text-primary transition-colors">
                                See how it works <span aria-hidden="true">→</span>
                            </Link>
                        </div>

                        <div className="mt-12 flex items-center justify-center gap-8 opacity-70 grayscale transition-all hover:grayscale-0">
                            <p className="text-sm text-muted-foreground">Trusted by users saving an average of $350/year</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Bento Grid Features - Content Unchanged */}
            <section id="features" className="py-24 sm:py-32 bg-secondary/20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for the subscription economy</h2>
                        <p className="mt-4 text-muted-foreground">Everything you need to stop the bleeding and take back control.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                        {/* Main feature - Large */}
                        <div className="md:col-span-2 row-span-2 rounded-3xl bg-card border border-border/50 p-8 flex flex-col justify-between overflow-hidden relative group hover:border-primary/20 transition-all duration-500">
                            <div className="absolute top-0 right-0 -m-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>

                            <div className="relative z-10">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                                    <Sparkles className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">AI-Powered Inbox Scanning</h3>
                                <p className="text-muted-foreground text-lg">
                                    Connect your Gmail and let our Gemini-powered engine find every receipt, renewal notice, and hidden trial. We never sell your data—we only look for money you can save.
                                </p>
                            </div>

                            {/* Abstract visual */}
                            <div className="mt-8 rounded-xl bg-muted/50 w-full h-64 border border-border/30 relative overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent z-10"></div>
                                <Inbox className="h-32 w-32 text-primary/20" />
                                <div className="absolute bottom-6 left-6 right-6 z-20 space-y-2">
                                    <div className="flex items-center gap-3 bg-background/90 backdrop-blur-md p-3 rounded-lg border shadow-sm">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <span className="font-medium text-sm">Netflix Subscription Found</span>
                                        <span className="ml-auto text-xs text-muted-foreground">Just now</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-background/90 backdrop-blur-md p-3 rounded-lg border shadow-sm opacity-80">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                        <span className="font-medium text-sm">Adobe Free Trial Ending</span>
                                        <span className="ml-auto text-xs text-muted-foreground">2m ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="md:col-span-1 rounded-3xl bg-card border border-border/50 p-8 flex flex-col relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
                            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                                <Bell className="h-6 w-6 text-orange-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Trust Scores</h3>
                            <p className="text-muted-foreground text-sm">
                                Know before you buy. We rate services on cancellation difficulty and ethical practices.
                            </p>
                            <div className="mt-auto pt-6 flex justify-center">
                                <div className="relative h-24 w-24 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent rotate-45"></div>
                                    <span className="text-3xl font-bold">92</span>
                                </div>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="md:col-span-1 rounded-3xl bg-card border border-border/50 p-8 flex flex-col relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
                            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                                <Zap className="h-6 w-6 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Instant Alerts</h3>
                            <p className="text-muted-foreground text-sm">
                                Get notified 3 days before a "free" trial turns into a $99/year charge.
                            </p>
                            <div className="mt-8 space-y-3">
                                <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                                    <span>Trial ending soon</span>
                                    <span className="text-blue-500 font-bold">3 days</span>
                                </div>
                                <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                                    <span>Auto-renewal</span>
                                    <span className="text-destructive font-bold">Tomorrow</span>
                                </div>
                            </div>
                        </div>

                        {/* Feature 4 - Wide */}
                        <div className="md:col-span-3 rounded-3xl bg-card border border-border/50 p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
                            <div className="flex-1">
                                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                                    <Eye className="h-6 w-6 text-purple-500" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Dark Pattern Detection</h3>
                                <p className="text-muted-foreground">
                                    Our algorithm spots design tricks companies use to keep you trapped. We flag hidden cancellation buttons, forced phone calls, and confusing language so you don't get tricked.
                                </p>
                            </div>
                            <div className="flex-1 w-full bg-muted/30 rounded-xl p-4 border border-border/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                    <span className="text-xs font-mono text-muted-foreground">DETECTED_PATTERN: ROACH_MOTEL</span>
                                </div>
                                <div className="space-y-2 font-mono text-xs">
                                    <p className="text-foreground">&gt; Analyze "gym-membership.com"</p>
                                    <p className="text-green-500">Scanning...</p>
                                    <p className="text-yellow-500">WARNING: Cancellation requires phone call.</p>
                                    <p className="text-yellow-500">WARNING: "Pause" button more prominent than "Cancel".</p>
                                    <p className="text-foreground">&gt; Trust Score: 12/100 (AVOID)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-b from-secondary to-background p-1 border border-border/50">
                        <div className="rounded-[22px] bg-background p-8 sm:p-16 text-center">
                            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                                <Lock className="h-8 w-8 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight mb-6">Your data is yours. Period.</h2>
                            <p className="text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                                We use official Google OAuth verification requesting only <strong>read-only</strong> access to your Gmail.
                                We parse machine-generated emails (receipts), not your personal conversations.
                                And we will never, ever sell your data to advertisers.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    )
}
