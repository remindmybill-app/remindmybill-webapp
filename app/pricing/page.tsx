"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, Mail, MessageSquare, TrendingUp, FileText, ShieldCheck, Loader2 } from "lucide-react"
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
    const supabase = getSupabaseBrowserClient()

    console.log("Calling create-checkout-session...")
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          subscription_tier: 'pro',
          period
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      if (data?.url) {
        window.location.href = data.url
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
              className={`relative overflow-hidden ${plan.highlight ? "border-primary/50 shadow-lg shadow-primary/20 ring-2 ring-primary/20" : ""
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
                        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground opacity-30" />
                      )}
                      <span
                        className={`${feature.included
                          ? feature.highlight
                            ? "font-medium text-foreground"
                            : "text-foreground"
                          : "text-muted-foreground opacity-50"
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

                      // Handle Upgrade using Server Action
                      setIsUpdating(true)
                      try {
                        await upgradeUserToPro(profile!.id)
                        // Trigger SWR revalidation globally (instant state sync)
                        await mutate()
                        toast.success("Welcome to Pro! 🎉")
                        setIsUpdating(false)
                      } catch (err: any) {
                        toast.error(err.message || "Upgrade failed")
                        setIsUpdating(false)
                      }
                    }
                  }}
                >
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {plan.name === "Pro Plan" && isPro(profile?.subscription_tier)
                    ? "Current Plan"
                    : plan.name === "Essential" && isFree(profile?.subscription_tier)
                      ? "Current Plan"
                      : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mx-auto max-w-3xl mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="grid gap-4">
            {[
              { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period." },
              { q: "How does the AI Inbox Hunter work?", a: "We securely scan your email receipts to automatically find subscriptions you might have forgotten about. We never sell your data." },
              { q: "Is there a limit on manual subscriptions?", a: "The Essential plan covers up to 3 subscriptions. Pro allows unlimited tracking." },
              { q: "Can I get a refund?", a: "We offer a 30-day money-back guarantee if you're not satisfied with the Pro features." }
            ].map((faq, i) => (
              <Card key={i} className="border-muted/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Downgrade Button for Premium Users */}
        {((profile?.subscription_tier as string) === 'premium' || profile?.subscription_tier === 'pro') && (
          <div className="flex justify-center mt-8">
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                setIsUpdating(true)
                await downgradeUserToFree(profile!.id)
                toast.success("Downgraded to Free plan")
                router.refresh()
              } catch (e) {
                toast.error("Downgrade failed")
                setIsUpdating(false)
              }
            }}>
              Downgrade to Free
            </Button>
          </div>
        )}

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
