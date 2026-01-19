"use client"

import { motion, useMotionValue, useSpring } from "framer-motion"
import { useEffect } from "react"

export function BackgroundEffects() {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    const springConfig = { damping: 25, stiffness: 700 }
    const springX = useSpring(mouseX, springConfig)
    const springY = useSpring(mouseY, springConfig)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
        }

        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [mouseX, mouseY])

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[#010302]">
            {/* Mesh Gradient / Glow */}
            <motion.div
                className="pointer-events-none absolute -inset-[100px] opacity-20"
                style={{
                    background: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.4) 0%, transparent 40%)`,
                }}
            />

            {/* Deep forest green pulses */}
            <div className="absolute top-0 left-0 h-full w-full">
                <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-emerald-900/20 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-emerald-900/20 blur-[120px] animate-pulse [animation-delay:2s]" />
            </div>

            {/* Noise Texture */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3%3C/filter%3%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3%3C/svg%3")`
                }}
            />
        </div>
    )
}
