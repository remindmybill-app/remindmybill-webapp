"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, Mail, MessageSquare, TrendingUp, FileText, ShieldCheck, Loader2, XCircle, Shield, CreditCard, Zap, Lock } from "lucide-react"
import { useProfile } from "@/lib/hooks/use-profile"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { upgradeUserToPro, downgradeUserToFree } from "@/app/actions/mock-upgrade"
import { isPro, isFree } from "@/lib/subscription-utils"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const { profile, mutate } = useProfile()
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleStripeCheckout = async (period: 'monthly' | 'yearly') => {
    if (!profile) {
      toast.error("Please sign in to upgrade")
      router.push("/auth/login")
      return
    }

    setIsUpdating(true)

    try {
      // Import server action and price IDs
      const { createCheckoutSession } = await import("@/app/actions/stripe")
      const { PRO_PRICE_ID_MONTHLY, PRO_PRICE_ID_YEARLY } = await import("@/lib/stripe")

      const priceId = period === 'yearly' ? PRO_PRICE_ID_YEARLY : PRO_PRICE_ID_MONTHLY

      console.log(`Creating Stripe checkout for ${period} with priceId: ${priceId}`)
      const result = await createCheckoutSession(profile.id, profile.email, priceId)

      if (result?.url) {
        window.location.href = result.url
      } else {
        throw new Error("No checkout URL returned")
      }

    } catch (error: any) {
      console.error("Upgrade Failed:", error)
      toast.error("Checkout failed: " + (error.message || "Unknown error"))
      setIsUpdating(false)
    }
  }

  const handleManageSubscription = () => {
    toast.info("Manage your subscription in the Settings page.")
    router.push("/settings")
  }

  const plans = [
    {
      name: "Essential",
      price: 0,
      description: "Perfect for getting started with subscription tracking",
      badge: null,
      features: [
        { text: "Up to 3 subscriptions", included: true, highlight: false },
        { text: "Basic renewal alerts", included: true, highlight: false },
        { text: "Manual tracking", included: true, highlight: false },
        { text: "Email notifications", included: true, highlight: false },
        { text: "AI Inbox Hunter", included: false, highlight: false },
        { text: "Priority support", included: false, highlight: false },
      ],
      cta: "Get Started",
      highlight: false,
    },
    {
      name: "Pro Plan",
      price: isAnnual ? 3.33 : 3.99,
      originalPrice: isAnnual ? 3.99 : null,
      description: "Complete automation and insights for power users",
      badge: "Most Popular",
      features: [
        { text: "Unlimited subscriptions", included: true, highlight: false },
        { text: "AI Inbox Hunter", included: true, highlight: true },
        // { text: "SMS alerts", included: true, highlight: true }, // Removed as per feedback
        { text: "Advanced analytics", included: true, highlight: false },
        { text: "Dark pattern detection", included: true, highlight: false },
        { text: "Priority support", included: true, highlight: false },
        { text: "Export & reporting", included: true, highlight: false },
      ],
      cta: "Upgrade to Pro",
      highlight: true,
    },
  ]

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-balance">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground text-balance">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mb-12 flex items-center justify-center gap-3">
          <Label htmlFor="billing-toggle" className={!isAnnual ? "font-semibold" : "text-muted-foreground"}>
            Monthly
          </Label>
          <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label htmlFor="billing-toggle" className={isAnnual ? "font-semibold" : "text-muted-foreground"}>
            Annual
          </Label>
          {isAnnual && <Badge className="bg-primary/20 text-primary">Save 17%</Badge>}
        </div>

        {/* Pricing Cards */}
        <div className="mb-12 grid gap-8 lg:grid-cols-2">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden transition-all duration-300 ${plan.highlight
                ? "border-primary shadow-lg shadow-primary/20 ring-1 ring-primary/20"
                : "border-white/10 bg-zinc-900/40 hover:border-white/20"
                }`}
            >
              {/* Current Plan Badge */}
              {((plan.name === "Pro Plan" && isPro(profile?.subscription_tier)) ||
                (plan.name === "Essential" && isFree(profile?.subscription_tier))) && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-primary text-primary-foreground shadow-lg font-bold">
                      ✓ CURRENT PLAN
                    </Badge>
                  </div>
                )}
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <Badge className="bg-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-xl border-2 border-background">
                    Recommended
                  </Badge>
                </div>
              )}
              {plan.highlight && (
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent" />
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </div>
                  {plan.badge && <Badge className="bg-primary text-primary-foreground">{plan.badge}</Badge>}
                </div>
                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">${plan.originalPrice}</span>
                    )}
                    <span className="text-muted-foreground">
                      {plan.price === 0 ? "forever" : isAnnual ? "/mo (billed annually)" : "/mo"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check
                          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${feature.highlight ? "text-primary" : "text-muted-foreground"
                            }`}
                        />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500/50" />
                      )}
                      <span
                        className={`${feature.included
                          ? feature.highlight
                            ? "font-medium text-foreground"
                            : "text-foreground"
                          : "text-zinc-400 dark:text-zinc-600 font-medium"
                          }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full gap-2"
                  variant={plan.highlight ? "default" : "outline"}
                  size="lg"
                  id={`checkout-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                  disabled={isUpdating || (plan.name === "Pro Plan" && isPro(profile?.subscription_tier)) || (plan.name === "Essential" && isFree(profile?.subscription_tier))}
                  onClick={async () => {
                    if (plan.name === "Essential") {
                      if (isPro(profile?.subscription_tier)) {
                        toast.info("To downgrade, go to Settings → Billing")
                        router.push("/settings?tab=billing")
                        return
                      }
                      router.push("/dashboard")
                      return
                    }

                    if (plan.name === "Pro Plan") {
                      if (isPro(profile?.subscription_tier)) {
                        handleManageSubscription()
                        return
                      }

                      // Handle Upgrade using Real Stripe Checkout
                      handleStripeCheckout(isAnnual ? 'yearly' : 'monthly')
                    }
                  }}
                >
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {plan.name === "Pro Plan" && isPro(profile?.subscription_tier)
                    ? "Manage Billing"
                    : plan.name === "Essential" && isFree(profile?.subscription_tier)
                      ? "Current Plan"
                      : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Premium FAQ Section */}
        <div className="mx-auto max-w-5xl mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Service & Trust FAQ</h2>
            <p className="text-zinc-400">Everything you need to know about our commitment to your financial health.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                q: "No-Questions-Asked Cancellation",
                a: "Enjoy total freedom. Cancel your subscription anytime with a single click from your dashboard—no retention traps or hidden hurdles.",
                icon: Shield
              },
              {
                q: "AI-Powered Inbox Protection",
                a: "Our Inbox Hunter securely scans your digital receipts using 256-bit encryption. We find the leaks, but never store or sell your private data.",
                icon: Lock
              },
              {
                q: "Unlimited Pro Scaling",
                a: "Scale without limits. While the Essential plan handles the basics, Pro gives you unlimited tracking for every service, app, and membership in your life.",
                icon: Zap
              },
              {
                q: "30-Day Trust Guarantee",
                a: "We stand by our insights. If Remind My Bill doesn't help you save more than the cost of the subscription in your first 30 days, we'll refund you instantly.",
                icon: CreditCard
              }
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl hover:border-emerald-500/20 transition-all duration-300 group backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-white/5 text-zinc-500 group-hover:text-emerald-400 transition-colors">
                    <faq.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-white">{faq.q}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>


        {/* Dev Tools - Reset Subscription */}
        {process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost') ? (
          <div className="flex justify-center mt-4 opacity-50 hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={async () => {
              try {
                setIsUpdating(true)
                await downgradeUserToFree(profile!.id)
                router.refresh()
              } catch (e) {
                toast.error("Reset failed")
                setIsUpdating(false)
              }
            }}>
              Dev: Reset to Free
            </Button>
          </div>
        ) : null}

        {/* Feature Highlights */}
        <div className="mt-12">
          <h2 className="mb-8 text-center text-2xl font-bold">What's included in Pro?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">AI Inbox Hunter</h3>
              <p className="text-sm text-muted-foreground">
                Automatically detects subscriptions from your email receipts
              </p>
            </div>
            {/* <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">SMS Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Get instant text messages before renewals and price changes
              </p>
            </div> */}
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Advanced Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track spending trends and optimize your subscription portfolio
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
