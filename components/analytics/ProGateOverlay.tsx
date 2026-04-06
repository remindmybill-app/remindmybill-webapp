"use client"

import { Lock, Sparkles } from "lucide-react"
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
    <div className="relative overflow-hidden rounded-2xl">
      {/* Real UI rendered behind the overlay */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Frosted overlay */}
      <div className="backdrop-blur-sm bg-black/60 absolute inset-0 rounded-2xl z-10 flex items-center justify-center">
        <div className="text-center p-6 max-w-xs">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-500/20 mb-4">
            <Lock className="h-6 w-6 text-indigo-400" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-white">{sectionName}</h3>
            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 mr-1" />
              Pro Feature
            </Badge>
          </div>

          <p className="text-sm text-zinc-300 mb-5 leading-relaxed">{description}</p>

          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:shadow-indigo-500/40"
          >
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
