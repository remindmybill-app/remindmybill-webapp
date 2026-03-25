"use client"
import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Receipt, X, ChevronRight, ChevronLeft } from "lucide-react"
import { ManualSubscriptionModal } from "@/components/manual-subscription-modal"
import Link from "next/link"
import { GmailTeaserTooltip } from "@/components/gmail-teaser-tooltip"

export function OnboardingCarousel({ 
  onManualAdd, 
  onScanGmail,
  isProStatus 
}: { 
  onManualAdd: () => void,
  onScanGmail?: () => void,
  isProStatus: boolean
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDismissed, setIsDismissed] = useState(true) // prevent hydration mismatch flash

  useEffect(() => {
    const dismissed = localStorage.getItem('rmb_onboarding_dismissed') === 'true'
    setIsDismissed(dismissed)
  }, [])

  useEffect(() => {
    if (isDismissed) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3)
    }, 8000)
    return () => clearInterval(interval)
  }, [isDismissed, activeIndex])

  if (isDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('rmb_onboarding_dismissed', 'true')
    setIsDismissed(true)
  }

  const nextSlide = () => setActiveIndex((prev) => (prev + 1) % 3)
  const prevSlide = () => setActiveIndex((prev) => (prev - 1 + 3) % 3)

  return (
    <Card className="rounded-3xl border-border bg-card shadow-lg relative overflow-hidden animate-in fade-in zoom-in-95 duration-500 mb-6">
      <button 
        onClick={handleDismiss} 
        className="absolute top-4 right-4 z-20 p-2 bg-background/50 hover:bg-background/80 rounded-full transition-colors"
        aria-label="Dismiss welcome guide"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <CardContent className="p-0">
        <div className="relative min-h-[420px] sm:min-h-[360px] flex items-center justify-center p-6 sm:p-8">
          
          {/* Panel 1 */}
          <div className={`absolute inset-0 p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-opacity duration-500 ${activeIndex === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <h2 className="text-2xl font-bold mb-2">👋 Welcome to RemindMyBill!</h2>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm">Track all your subscriptions in one place and never miss a renewal.</p>
            
            <div className="mb-6 rounded-2xl bg-primary/10 p-5">
              <Receipt className="h-10 w-10 text-primary" />
            </div>

            <div className="text-sm text-left w-full max-w-sm space-y-2 mb-8 bg-muted/50 p-4 rounded-xl">
              <p><strong>1.</strong> Add your first subscription below</p>
              <p><strong>2.</strong> Get reminders 3 days before billing</p>
              <p><strong>3.</strong> View your spending analytics</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-auto sm:mt-0 mb-8 sm:mb-0">
              <ManualSubscriptionModal 
                onSubscriptionAdded={onManualAdd} 
                trigger={
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl w-full sm:w-auto">
                    + Add Subscription
                  </Button>
                }
              />
              <GmailTeaserTooltip>
                <Button variant="outline" className="h-11 rounded-xl w-full sm:w-auto" onClick={onScanGmail}>
                  Connect Gmail {!isProStatus && "(Pro)"}
                </Button>
              </GmailTeaserTooltip>
            </div>
          </div>

          {/* Panel 2 */}
          <div className={`absolute inset-0 p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-opacity duration-500 ${activeIndex === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <h2 className="text-2xl font-bold mb-6">✅ How RemindMyBill Works</h2>
             
             <div className="text-sm text-left w-full max-w-sm space-y-3 mb-8 bg-muted/50 p-5 rounded-xl border border-border">
              <p>1️⃣ Add Netflix → Set renewal date → Done</p>
              <p>2️⃣ Get email 3 days before it bills</p>
              <p>3️⃣ See spending trends + analytics (Pro)</p>
              <p>4️⃣ Cancel easily with our Trust Center guides</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-auto sm:mt-0 mb-8 sm:mb-0">
              <Button variant="ghost" onClick={prevSlide} className="sm:mr-2 w-full sm:w-auto h-11">Previous</Button>
              <ManualSubscriptionModal 
                onSubscriptionAdded={onManualAdd} 
                trigger={<Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 w-full sm:w-auto">+ Add Subscription</Button>}
              />
              <GmailTeaserTooltip>
                <Button variant="outline" className="rounded-xl h-11 w-full sm:w-auto" onClick={onScanGmail}>
                  Connect Gmail {!isProStatus && "(Pro)"}
                </Button>
              </GmailTeaserTooltip>
            </div>
          </div>

          {/* Panel 3 */}
          <div className={`absolute inset-0 p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-opacity duration-500 ${activeIndex === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             <div className="mb-4 inline-block px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-full tracking-widest uppercase">Premium</div>
             <h2 className="text-2xl font-bold mb-6">🚀 Go Pro for $4.99/month</h2>
             
             <div className="text-sm text-left w-full max-w-sm space-y-3 mb-8 bg-indigo-500/5 p-5 rounded-xl border border-indigo-500/20">
              <p className="flex gap-2"><span className="text-indigo-500 shrink-0">✅</span> <span>Unlimited subscriptions (vs 5 free)</span></p>
              <p className="flex gap-2"><span className="text-indigo-500 shrink-0">✅</span> <span>Full spending analytics</span></p>
              <p className="flex gap-2"><span className="text-indigo-500 shrink-0">✅</span> <span>Gmail auto-import (no manual entry)</span></p>
              <p className="flex gap-2"><span className="text-indigo-500 shrink-0">✅</span> <span>Priority support</span></p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-auto sm:mt-0 mb-8 sm:mb-0">
              <Button variant="ghost" onClick={prevSlide} className="sm:mr-2 w-full sm:w-auto h-11">Previous</Button>
              <ManualSubscriptionModal 
                onSubscriptionAdded={onManualAdd} 
                trigger={<Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 w-full sm:w-auto">+ Add Subscription</Button>}
              />
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 w-full sm:w-auto">
                 <Link href="/pricing" className="flex items-center justify-center">Upgrade to Pro <ChevronRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-20">
          <Button variant="ghost" size="icon" onClick={prevSlide} className="h-8 w-8 rounded-full bg-background/50 hover:bg-background">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2 items-center">
            {[0, 1, 2].map(i => (
              <button 
                key={i} 
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all ${activeIndex === i ? 'w-6 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={nextSlide} className="h-8 w-8 rounded-full bg-background/50 hover:bg-background">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
