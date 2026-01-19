"use client"

import { motion } from "framer-motion"

const avatars = [
    "https://i.pravatar.cc/150?u=1",
    "https://i.pravatar.cc/150?u=2",
    "https://i.pravatar.cc/150?u=3",
    "https://i.pravatar.cc/150?u=4",
    "https://i.pravatar.cc/150?u=5",
]

const logos = [
    "Stripe", "Plaid", "Gemini", "AWS", "Vercel"
]

export function SocialProof() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                    {avatars.map((url, i) => (
                        <motion.img
                            key={i}
                            src={url}
                            alt="User"
                            className="h-10 w-10 rounded-full border-2 border-[#020804] bg-muted grayscale hover:grayscale-0 transition-all cursor-crosshair"
                            whileHover={{ scale: 1.2, zIndex: 10 }}
                        />
                    ))}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#020804] bg-emerald-950 text-[10px] font-bold text-emerald-500">
                        +2k
                    </div>
                </div>
                <div className="text-sm text-white/40">
                    <span className="font-bold text-emerald-500">2,500+</span> professionals taking control
                </div>
            </div>

            <div className="flex flex-wrap gap-8 opacity-30">
                {logos.map((logo) => (
                    <motion.span
                        key={logo}
                        className="text-sm font-black tracking-widest uppercase hover:text-emerald-500 transition-colors cursor-default"
                        whileHover={{ opacity: 1, scale: 1.05 }}
                    >
                        {logo}
                    </motion.span>
                ))}
            </div>
        </div>
    )
}
