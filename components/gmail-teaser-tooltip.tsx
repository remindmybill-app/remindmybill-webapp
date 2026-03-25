import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function GmailTeaserTooltip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 glass-panel">
          <div className="space-y-1">
            <p className="font-bold text-sm">Gmail Integration (Pro)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Auto-imports all your subscriptions from receipts.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">No manual entry. Works with Netflix, Spotify, Amazon, etc.</p>
            <p className="text-xs font-semibold mt-2 text-indigo-400">Saves 15+ minutes per month.</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
