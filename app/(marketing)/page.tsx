
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell, Sparkles, Inbox, Lock, ArrowRight, CheckCircle2, Zap, Eye, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useEffect, useState } from "react"

import { BackgroundEffects } from "@/components/landing/BackgroundEffects"
import { HeroMockup } from "@/components/landing/HeroMockup"
import { LiveStatsTicker } from "@/components/landing/LiveStatsTicker"
import { SocialProof } from "@/components/landing/SocialProof"
import { motion } from "framer-motion"

export default function LandingPage() {
    const { user, isLoading } = useAuth()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3,
            },
        },
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.8, ease: "easeOut" as const },
        },
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground font-sans selection:bg-emerald-500/20 overflow-x-hidden">
            <BackgroundEffects />

            {/* Hero Section */}
            <header className="relative pt-20 pb-16 md:pt-32 lg:pt-48">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center"
                    >
                        {/* Left Side: Content */}
                        <div className="flex flex-col items-start text-left">
                            <motion.div variants={itemVariants} className="mb-6">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-md">
                                    <Sparkles className="h-3 w-3" />
                                    New: AI Receipt Scanning 2.0
                                </div>
                            </motion.div>

                            <motion.h1
                                variants={itemVariants}
                                className="text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl leading-[0.9] mb-8"
                                style={{ letterSpacing: "-0.04em" }}
                            >
                                Reclaim your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600">
                                    Freedom.
                                </span>
                            </motion.h1>

                            <motion.p
                                variants={itemVariants}
                                className="text-xl leading-relaxed text-white/50 max-w-xl mb-10"
                            >
                                I built Remind My Bill because I was tired of losing money to "free" trials.
                                Our AI finds the leaks, so your inbox finally <span className="text-white font-bold underline decoration-emerald-500 underline-offset-4 cursor-help">pays for itself.</span>
                            </motion.p>

                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 mb-12 w-full sm:w-auto">
                                {isLoading ? (
                                    <Button size="lg" disabled className="h-14 px-8 text-lg w-full sm:w-auto">
                                        Loading...
                                    </Button>
                                ) : user ? (
                                    <Link href="/dashboard" className="w-full sm:w-auto">
                                        <Button size="lg" className="group relative overflow-hidden h-14 px-10 text-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-black border-none transition-all w-full sm:w-auto">
                                            <span className="relative z-10 flex items-center gap-2">
                                                Go to Dashboard <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                            <div className="absolute inset-x-0 -top-[100%] h-[200%] w-full animate-[shimmer_2s_infinite] bg-gradient-to-b from-transparent via-white/30 to-transparent skew-y-[-20deg]" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link href="/auth/login" className="w-full sm:w-auto">
                                        <Button size="lg" className="group relative overflow-hidden h-14 px-10 text-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-black border-none transition-all w-full sm:w-auto">
                                            <span className="relative z-10 flex items-center gap-2">
                                                Get Started <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                            <div className="absolute inset-x-0 -top-[100%] h-[200%] w-full animate-[shimmer_2s_infinite] bg-gradient-to-b from-transparent via-white/30 to-transparent skew-y-[-20deg]" />
                                        </Button>
                                    </Link>
                                )}

                                <Link href="#features" className="text-sm font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                                    How it works
                                </Link>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <SocialProof />
                            </motion.div>
                        </div>

                        {/* Right Side: Visual */}
                        <motion.div
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                            className="relative hidden lg:block"
                        >
                            <HeroMockup />
                        </motion.div>
                    </motion.div>
                </div>
            </header>

            {/* Live Ticker */}
            <LiveStatsTicker />

            {/* Bento Grid Features - Restored and Refined */}
            <section id="features" className="py-24 sm:py-40 relative">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-24">
                        <h2 className="text-4xl font-black tracking-tight sm:text-5xl mb-6">Built for the subscription economy</h2>
                        <p className="text-xl text-white/40">Everything you need to stop the bleeding and take back control.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                        {/* Main feature - Large */}
                        <div className="md:col-span-2 row-span-2 rounded-[2rem] bg-white/[0.03] border border-white/5 p-10 flex flex-col justify-between overflow-hidden relative group hover:border-emerald-500/20 transition-all duration-500">
                            <div className="absolute top-0 right-0 -m-16 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] group-hover:bg-emerald-500/20 transition-all duration-700"></div>

                            <div className="relative z-10">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20">
                                    <Sparkles className="h-7 w-7 text-emerald-500" />
                                </div>
                                <h3 className="text-3xl font-black mb-4 tracking-tight">AI-Powered Scanning</h3>
                                <p className="text-white/40 text-lg leading-relaxed max-w-md">
                                    Connect your Gmail and let our Gemini-powered engine find every receipt, renewal notice, and hidden trial.
                                </p>
                            </div>

                            {/* Abstract visual */}
                            <div className="mt-12 rounded-2xl bg-black/40 w-full h-80 border border-white/5 relative overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020804] to-transparent z-10"></div>
                                <Inbox className="h-40 w-40 text-white/[0.03]" />
                                <div className="absolute bottom-10 left-10 right-10 z-20 space-y-3">
                                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-2xl p-4 rounded-xl border border-white/10 shadow-2xl">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="font-bold text-sm tracking-tight">Netflix Subscription Found</span>
                                        <span className="ml-auto text-xs font-medium text-white/30">$15.99/mo</span>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-2xl p-4 rounded-xl border border-white/10 shadow-2xl opacity-60">
                                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                        <span className="font-bold text-sm tracking-tight">Adobe Free Trial Ending</span>
                                        <span className="ml-auto text-xs font-medium text-white/30">2 days left</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="md:col-span-1 rounded-[2rem] bg-white/[0.03] border border-white/5 p-10 flex flex-col relative overflow-hidden group hover:border-orange-500/20 transition-all duration-500">
                            <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-8 border border-orange-500/20">
                                <Bell className="h-7 w-7 text-orange-500" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 tracking-tight">Trust Scores</h3>
                            <p className="text-white/40 leading-relaxed text-sm">
                                Know before you buy. We rate services on cancellation difficulty and ethical practices.
                            </p>
                            <div className="mt-auto pt-6 flex justify-center">
                                <div className="relative h-28 w-28 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
                                    <div className="absolute inset-0 rounded-full border-2 border-orange-500 border-t-transparent animate-[spin_3s_linear_infinite]"></div>
                                    <span className="text-4xl font-black">92</span>
                                </div>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="md:col-span-1 rounded-[2rem] bg-white/[0.03] border border-white/5 p-10 flex flex-col relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500">
                            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20">
                                <Zap className="h-7 w-7 text-blue-500" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 tracking-tight">Instant Alerts</h3>
                            <p className="text-white/40 leading-relaxed text-sm">
                                Get notified 3 days before a "free" trial turns into a $99/year charge.
                            </p>
                            <div className="mt-8 space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold p-3 rounded-xl bg-white/5 border border-white/5">
                                    <span className="text-white/40 uppercase tracking-widest">Trial End</span>
                                    <span className="text-blue-500">3 DAYS</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold p-3 rounded-xl bg-white/5 border border-white/5">
                                    <span className="text-white/40 uppercase tracking-widest">Renewing</span>
                                    <span className="text-red-500">TOMORROW</span>
                                </div>
                            </div>
                        </div>

                        {/* Feature 4 - Wide */}
                        <div className="md:col-span-3 rounded-[2rem] bg-white/[0.03] border border-white/5 p-10 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-500">
                            <div className="flex-1">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20">
                                    <Eye className="h-7 w-7 text-emerald-500" />
                                </div>
                                <h3 className="text-3xl font-black mb-4 tracking-tight">Pattern Detection</h3>
                                <p className="text-white/40 text-lg leading-relaxed">
                                    Our algorithm spots design tricks companies use to keep you trapped. We flag hidden cancellation buttons and forced phone calls.
                                </p>
                            </div>
                            <div className="flex-1 w-full bg-black/40 rounded-2xl p-8 border border-white/5 font-mono text-xs overflow-hidden relative">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-white/20 uppercase tracking-widest">System Monitor // Active</span>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-white/60 flex items-center gap-2">
                                        <span className="text-emerald-500">$</span> analyze --service gym-membership.com
                                    </p>
                                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-500/80">
                                        [WARNING] Cancellation requires phone call
                                    </div>
                                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-emerald-500/80">
                                        [ANALYSIS] Trust Score: 12/100 (EXTREME RISK)
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                                    <Zap className="h-40 w-40" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="py-24 sm:py-40">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl rounded-[3rem] bg-gradient-to-br from-emerald-500/10 via-white/[0.02] to-transparent p-[1px]">
                        <div className="rounded-[2.95rem] bg-[#020804]/90 backdrop-blur-3xl p-12 sm:p-24 text-center">
                            <div className="mx-auto h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-10 border border-emerald-500/20">
                                <Lock className="h-10 w-10 text-emerald-500" />
                            </div>
                            <h2 className="text-4xl font-black tracking-tight mb-8 sm:text-6xl leading-tight">Your data is yours. <br className="hidden sm:block" /> Period.</h2>
                            <p className="text-xl leading-relaxed text-white/40 max-w-2xl mx-auto mb-12">
                                We use official Google OAuth verification requesting only <strong>read-only</strong> access.
                                We never sell your data—we only look for money you can save.
                            </p>
                            <div className="flex flex-wrap justify-center gap-8 opacity-40">
                                {['AES-256 Encryption', 'ReadOnly Access', 'No Data Selling', 'SOC-2 Compliant'].map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <style jsx global>{`
                @keyframes shimmer {
                    0% { transform: translateY(-100%) skewY(-20deg); }
                    100% { transform: translateY(100%) skewY(-20deg); }
                }
                .perspective-[1000px] {
                    perspective: 1000px;
                }
            `}</style>
        </div>
    )
}
