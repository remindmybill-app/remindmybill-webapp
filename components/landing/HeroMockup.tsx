"use client"

import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Bell, CreditCard } from "lucide-react"

export function HeroMockup() {
    return (
        <div className="relative w-full max-w-[600px] perspective-[1000px]">
            <motion.div
                initial={{ rotateY: 15, rotateX: 10, y: 20, opacity: 0 }}
                animate={{ rotateY: -10, rotateX: 5, y: 0, opacity: 1 }}
                transition={{
                    duration: 1.5,
                    ease: "easeOut",
                    rotateY: { duration: 10, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                }}
                className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl"
            >
                {/* Mockup Header */}
                <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-red-500/50" />
                        <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
                        <div className="h-2 w-2 rounded-full bg-green-500/50" />
                    </div>
                    <div className="h-4 w-32 rounded-full bg-white/10" />
                    <div className="h-6 w-6 rounded-full bg-white/10" />
                </div>

                {/* Mockup Content */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                            <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Potential Savings</div>
                            <div className="mt-1 text-2xl font-bold text-white">$420.00</div>
                        </div>
                        <div className="h-20 rounded-xl bg-white/5 border border-white/10 p-3">
                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Active Subs</div>
                            <div className="mt-1 text-2xl font-bold text-white">12</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 p-3 border border-white/5">
                                <div className="h-8 w-8 rounded-md bg-white/10" />
                                <div className="flex-1 space-y-1">
                                    <div className="h-2 w-24 rounded bg-white/20" />
                                    <div className="h-2 w-16 rounded bg-white/10" />
                                </div>
                                <div className="h-2 w-8 rounded bg-white/20" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tilted Floating Card (Subscription Cancelled) */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-8 -top-8 z-20 w-64 rounded-xl border border-emerald-500/30 bg-emerald-950/80 p-4 backdrop-blur-2xl shadow-2xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Subscription Cancelled</div>
                            <div className="text-xs text-emerald-500/80">Saved $14.99/mo</div>
                        </div>
                    </div>
                </motion.div>

                {/* Another Card (Security/Alert) */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -left-12 bottom-12 z-20 w-56 rounded-xl border border-red-500/30 bg-red-950/80 p-4 backdrop-blur-2xl shadow-2xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                            <Bell className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Trial Ending Soon</div>
                            <div className="text-xs text-red-500/80">Adobe Creative Cloud</div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[100px]" />
        </div>
    )
}
