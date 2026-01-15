"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, Mail, MessageSquare, TrendingUp, FileText, ShieldCheck } from "lucide-react"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

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
        { text: "Trust Analyst deep-reports", included: false, highlight: false },
        { text: "SMS alerts", included: false, highlight: false },
        { text: "Priority support", included: false, highlight: false },
      ],
      cta: "Get Started",
      highlight: false,
    },
    {
      name: "Automated (Pro)",
      price: isAnnual ? 3.33 : 3.99,
      originalPrice: isAnnual ? 3.99 : null,
      description: "Complete automation and insights for power users",
      badge: "Most Popular",
      features: [
        { text: "Unlimited subscriptions", included: true, highlight: false },
        { text: "AI Inbox Hunter", included: true, highlight: true },
        { text: "Trust Analyst deep-reports", included: true, highlight: true },
        { text: "SMS alerts", included: true, highlight: true },
        { text: "Advanced analytics", included: true, highlight: false },
        { text: "Dark pattern detection", included: true, highlight: false },
        { text: "Priority support", included: true, highlight: false },
        { text: "Export & reporting", included: true, highlight: false },
      ],
      cta: "Start Free Trial",
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
                <Button className="w-full" variant={plan.highlight ? "default" : "outline"} size="lg">
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Money-Back Guarantee */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center md:flex-row md:text-left">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-xl font-bold">30-Day Money-Back Guarantee</h3>
              <p className="text-muted-foreground">
                Try Remind My Bill Pro risk-free. If you're not completely satisfied within the first 30 days, we'll refund
                your money—no questions asked.
              </p>
            </div>
          </CardContent>
        </Card>

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
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Trust Analyst Reports</h3>
              <p className="text-sm text-muted-foreground">
                Deep analysis of cancellation difficulty and dark patterns
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">SMS Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Get instant text messages before renewals and price changes
              </p>
            </div>
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
