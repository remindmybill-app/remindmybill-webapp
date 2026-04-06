"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface ProGateOverlayProps {
  /** Name of the section being gated, e.g. "Spending Trends" */
  sectionName: string
  /** One-line description of what Pro unlocks */
  description: string
  /** The actual Pro content to render behind the overlay */
  children: React.ReactNode
}

/**
 * Wraps a Pro-only section: renders the full UI behind a frosted overlay
 * with an upsell card. Pro users see content normally (don't wrap with this).
 */
export function ProGateOverlay({ sectionName, description, children }: ProGateOverlayProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl w-full h-full min-h-[200px]">
      {/* Real UI rendered behind the overlay */}
      <div className="pointer-events-none select-none w-full h-full" aria-hidden="true">
        {children}
      </div>

      {/* Frosted overlay */}
      <div className="backdrop-blur-sm bg-black/60 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6">
        <Lock className="text-emerald-400" size={28} />
        
        <h3 className="text-white font-semibold text-base">{sectionName}</h3>
        
        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Pro Feature
        </Badge>
        
        <p className="text-gray-400 text-sm text-center max-w-[180px]">
          {description}
        </p>

        <Button
          asChild
          className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-5 py-2 rounded-xl mt-1"
        >
          <Link href="/pricing">Upgrade to Pro</Link>
        </Button>
      </div>
    </div>
  )
}
