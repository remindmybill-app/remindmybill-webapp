"use client"

import { motion } from "framer-motion"

const stats = [
    "$12,400 saved this week",
    "4,200 trials cancelled",
    "98% detection rate",
    "Trusted by 50,000+ users",
    "Average $350 saved per user",
    "Real-time fraud alerts active",
]

export function LiveStatsTicker() {
    return (
        <div className="relative flex w-full overflow-hidden border-y border-white/5 bg-white/[0.02] py-4 backdrop-blur-sm">
            <div className="flex animate-marquee whitespace-nowrap">
                {[...stats, ...stats].map((stat, i) => (
                    <div key={i} className="mx-8 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium tracking-wide text-white/50">{stat}</span>
                    </div>
                ))}
            </div>

            {/* Gradients to fade edges */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#020804] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#020804] to-transparent z-10" />

            <style jsx>{`
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
        </div>
    )
}
