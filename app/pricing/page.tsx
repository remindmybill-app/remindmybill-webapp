"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Check, X, Shield, Crown, Sparkles, Zap, ShieldCheck, Loader2
} from "lucide-react"
import { useProfile } from "@/lib/hooks/use-profile"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { TIER_PRICING } from "@/lib/tier-config"
import { isPro, isLifetime } from "@/lib/subscription-utils"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const { profile } = useProfile()
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const userTier = profile?.user_tier || 'free'

  // ─── Checkout Handler ───────────────────────────────────────────
  const handleCheckout = async (tier: 'pro' | 'lifetime') => {
    if (!profile) {
      toast.error("Please sign in to upgrade")
      router.push("/auth/login")
      return
    }

    setIsUpdating(true)

    try {
      const { createCheckoutSession } = await import("@/app/actions/stripe")
      const result = await createCheckoutSession({
        userId: profile.id,
        email: profile.email,
        tier,
        interval: isAnnual ? 'yearly' : 'monthly',
      })

      if (result?.url) {
        window.location.href = result.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error: any) {
      console.error("Checkout failed:", error)
      toast.error("Checkout failed: " + (error.message || "Unknown error"))
      setIsUpdating(false)
    }
  }

  const proMonthly = TIER_PRICING.pro.monthly
  const proAnnualPerMonth = +(TIER_PRICING.pro.annual / 12).toFixed(2)
  const annualSavingsPercent = Math.round(
    ((proMonthly * 12 - TIER_PRICING.pro.annual) / (proMonthly * 12)) * 100
  )

  // ─── Plan Definitions ──────────────────────────────────────────
  const plans = [
    {
      id: 'free' as const,
      name: "Guardian",
      tagline: "Essential Protection",
      price: 0,
      priceSuffix: "forever",
      icon: Shield,
      iconColor: "text-zinc-400",
      borderClass: "border-zinc-700/50 hover:border-zinc-600/70",
      bgClass: "bg-zinc-900/40",
      features: [
        { text: "Track up to 7 subscriptions", included: true },
        { text: "Monthly spending overview", included: true },
        { text: "Health Score calculation", included: true },
        { text: "3 email alerts per month", included: true },
        { text: "Trust Center read-only access", included: true },
        { text: "Mobile-responsive web app", included: true },
        { text: "Push notifications (PWA installed)", included: true },
        { text: "Advanced Analytics", included: false },
        { text: "Export reports (CSV/PDF)", included: false },
        { text: "Payment Calendar", included: false },
        { text: "Priority support", included: false },
      ],
      cta: userTier === 'free' ? "Current Plan" : "Get Started",
      ctaVariant: "outline" as const,
      disabled: userTier === 'free',
    },
    {
      id: 'pro' as const,
      name: "Shield",
      tagline: "Full Protection Suite",
      price: isAnnual ? proAnnualPerMonth : proMonthly,
      priceSuffix: isAnnual ? `/mo (billed $${TIER_PRICING.pro.annual}/yr)` : "/month",
      icon: Sparkles,
      iconColor: "text-blue-400",
      borderClass: "border-blue-500/40 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/10",
      bgClass: "bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5",
      features: [
        { text: "Unlimited subscription tracking", included: true },
        { text: "Unlimited email alerts", included: true },
        { text: "Advanced Analytics dashboard", included: true },
        { text: "Interactive Payment Calendar", included: true },
        { text: "Export reports (CSV/PDF)", included: true },
        { text: "Trust Center contributions", included: true },
        { text: "Priority email support (24hr)", included: true },
        { text: "Push notifications (Unlimited)", included: true },
        { text: "Early access to new features", included: true },
      ],
      cta: isPro(userTier) && !isLifetime(userTier) ? "Current Plan" : "Upgrade Now",
      ctaVariant: "default" as const,
      disabled: isPro(userTier) && !isLifetime(userTier),
      highlight: true,
    },
    {
      id: 'lifetime' as const,
      name: "Fortress",
      tagline: "Lifetime Protection",
      price: TIER_PRICING.lifetime.oneTime,
      priceSuffix: "one-time payment",
      icon: Crown,
      iconColor: "text-amber-400",
      borderClass: "border-amber-500/30 hover:border-amber-500/50",
      bgClass: "bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5",
      features: [
        { text: "All Pro features, forever", included: true },
        { text: "Immune to future price increases", included: true },
        { text: 'Exclusive "Lifetime Member" badge', included: true },
        { text: "All future feature updates", included: true },
        { text: "Unlimited everything", included: true },
        { text: "Priority support forever", included: true },
        { text: "Push notifications (Unlimited)", included: true },
        { text: "No recurring charges", included: true },
      ],
      cta: isLifetime(userTier) ? "Current Plan" : "Claim Lifetime Access",
      ctaVariant: "outline" as const,
      disabled: isLifetime(userTier),
    },
  ]

  // ─── Feature Comparison Data ───────────────────────────────────
  const comparisonFeatures = [
    { name: "Subscriptions tracked", free: "7", pro: "Unlimited", lifetime: "Unlimited" },
    { name: "Email alerts", free: "3/month", pro: "Unlimited", lifetime: "Unlimited" },
    { name: "Push notifications", free: "Limited", pro: "Unlimited", lifetime: "Unlimited" },
    { name: "Advanced Analytics", free: "❌", pro: "✅", lifetime: "✅" },
    { name: "Payment Calendar", free: "❌", pro: "✅", lifetime: "✅" },
    { name: "Trust Center contributions", free: "❌", pro: "✅", lifetime: "✅" },
    { name: "Export reports", free: "❌", pro: "✅", lifetime: "✅" },
    { name: "Priority support", free: "❌", pro: "✅", lifetime: "✅" },
    { name: "Future price increases", free: "N/A", pro: "May apply", lifetime: "Immune ✨" },
    { name: "Lifetime badge", free: "❌", pro: "❌", lifetime: "👑" },
  ]

  return (
    <div className="min-h-screen bg-background py-12 lg:py-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">

        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="mb-12 text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm">
            Simple, Transparent Pricing
          </Badge>
          <h1 className="mb-3 text-4xl font-bold tracking-tight lg:text-5xl">
            Choose Your Level of Protection
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            From basic tracking to lifetime coverage — pick the plan that matches your needs.
          </p>
        </div>

        {/* ─── Billing Toggle ──────────────────────────────────── */}
        <div className="mb-12 flex items-center justify-center gap-3">
          <Label
            htmlFor="billing-toggle"
            className={`cursor-pointer ${!isAnnual ? "font-semibold text-foreground" : "text-muted-foreground"}`}
          >
            Monthly
          </Label>
          <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label
            htmlFor="billing-toggle"
            className={`cursor-pointer ${isAnnual ? "font-semibold text-foreground" : "text-muted-foreground"}`}
          >
            Annual
          </Label>
          {isAnnual && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-in fade-in slide-in-from-left-2">
              Save {annualSavingsPercent}%
            </Badge>
          )}
        </div>

        {/* ─── Pricing Cards ───────────────────────────────────── */}
        <div className="mb-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 ${plan.borderClass} ${plan.bgClass} flex flex-col`}
            >
              {/* Popular Badge */}
              {plan.highlight && (
                <div className="absolute top-0 right-0 z-10">
                  <div className="bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {plan.disabled && profile && (
                <div className="absolute top-3 left-3 z-10">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-bold">
                    ✓ Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${plan.iconColor}`}>
                    <plan.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold tracking-tight">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-4">
                <ul className="space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-600" />
                      )}
                      <span className={`text-sm ${feature.included ? "text-foreground" : "text-zinc-500"}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-2 pb-6">
                <Button
                  className={`w-full gap-2 h-12 text-sm font-semibold transition-all ${plan.id === 'pro'
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                    : plan.id === 'lifetime'
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/25"
                      : ""
                    }`}
                  variant={plan.id === 'free' ? "outline" : "default"}
                  size="lg"
                  disabled={isUpdating || plan.disabled}
                  onClick={() => {
                    if (plan.id === 'free') {
                      router.push("/dashboard")
                      return
                    }
                    handleCheckout(plan.id)
                  }}
                >
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* ─── Social Proof Stats ──────────────────────────────── */}
        <div className="mb-16 grid grid-cols-3 gap-4 rounded-2xl border border-white/5 bg-zinc-900/30 p-4 sm:p-8">
          {[
            { value: "12,450+", label: "Active Users" },
            { value: "$1.2M+", label: "Saved Collectively" },
            { value: "4.8/5", label: "User Rating" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ─── Feature Comparison Table ────────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900/60 sticky top-0 z-10">
                  <th className="text-left p-4 font-semibold text-muted-foreground">Feature</th>
                  <th className="text-center p-4 font-semibold">
                    <span className="text-zinc-400">Guardian</span>
                    <span className="block text-xs text-muted-foreground font-normal">Free</span>
                  </th>
                  <th className="text-center p-4 font-semibold">
                    <span className="text-blue-400">Shield</span>
                    <span className="block text-xs text-muted-foreground font-normal">$4.99/mo</span>
                  </th>
                  <th className="text-center p-4 font-semibold">
                    <span className="text-amber-400">Fortress</span>
                    <span className="block text-xs text-muted-foreground font-normal">$99 once</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={i} className={`border-t border-white/5 ${i % 2 === 0 ? "bg-zinc-900/20" : ""}`}>
                    <td className="p-4 font-medium text-foreground">{row.name}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.free}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.pro}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Testimonials ────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">What Users Say</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                quote: "RemindMyBill saved me $240 by catching a forgotten gym membership. The Pro tier paid for itself in the first month!",
                name: "Sarah K.",
                role: "Shield User",
              },
              {
                quote: "The Payment Calendar is a game-changer. I can see exactly when every bill hits and plan my budget accordingly.",
                name: "Marcus T.",
                role: "Shield User",
              },
              {
                quote: "Best $99 I ever spent. Lifetime access means I never have to worry about subscription bills sneaking up on me again.",
                name: "Elena R.",
                role: "Fortress User",
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 hover:border-white/10 transition-all"
              >
                <p className="text-sm text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── FAQ Section ─────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                q: "Refund Policy",
                a: "RemindMyBill does not offer refunds. You can cancel your subscription at any time to prevent future charges, but we do not provide prorated refunds for the remaining billing period.",
                icon: Shield,
              },
              {
                q: "What happens to my data if I downgrade?",
                a: "Your data is always safe. On Free tier, subscriptions beyond the 7-limit become read-only until you upgrade again.",
                icon: ShieldCheck,
              },
              {
                q: "Is the Lifetime plan really forever?",
                a: "Yes! One payment of $99 gives you full access to all current and future features (excluding AI add-ons explicitly marked as premium).",
                icon: Crown,
              },
              {
                q: "What happens if I cancel?",
                a: "You will retain access to your Pro features until the end of your current billing cycle. After that, your account will revert to the Guardian (Free) tier.",
                icon: Zap,
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 hover:border-emerald-500/20 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-white/5 text-zinc-500 group-hover:text-emerald-400 transition-colors">
                    <faq.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold">{faq.q}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Dev Tools ───────────────────────────────────────── */}
        {(process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) && (
          <div className="flex justify-center mt-4 opacity-30 hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={async () => {
              try {
                setIsUpdating(true)
                const { downgradeUserToFree } = await import("@/app/actions/mock-upgrade")
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
        )}
      </div>
    </div>
  )
}
