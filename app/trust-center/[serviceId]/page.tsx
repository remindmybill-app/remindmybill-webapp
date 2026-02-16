"use client"

import { use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, TrendingUp, ExternalLink, Lightbulb } from "lucide-react"
import Link from "next/link"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

// Mock pricing history data
const pricingHistory = [
  { year: "2020", price: 8.99 },
  { year: "2021", price: 8.99 },
  { year: "2022", price: 9.99 },
  { year: "2023", price: 11.99 },
  { year: "2024", price: 15.99 },
]

// Mock service analysis data
const serviceAnalysis = {
  id: "netflix",
  name: "Netflix",
  category: "Streaming",
  trust_score: 92,
  cancellation_difficulty: "medium" as "easy" | "medium" | "hard",
  current_price: 15.99,
  price_increases: 3,
  dark_patterns: [
    "Cancellation link hidden in account settings under 'Membership & Billing'",
    "Requires multiple confirmation steps to cancel",
  ],
  positive_features: [
    "No unexpected charges reported",
    "Clear pricing structure",
    "Easy to understand subscription tiers",
    "Good customer support responsiveness",
  ],
  risk_flags: [
    "Auto-renewal enabled by default",
    "Cancellation requires account login (no email option)",
    "Price has increased 77% since 2020",
  ],
  ai_recommendation: {
    verdict: "Generally Trustworthy with Cautions",
    reasoning:
      "Netflix maintains a high trust score due to transparent billing and reliable service. However, the cancellation process could be more user-friendly, and recent price increases are significant. The service is worth keeping if you use it regularly, but consider downgrading to a lower tier if you're not utilizing 4K streaming.",
    alternative_suggestions: [
      "Consider Disney+ or Hulu for similar content at lower prices",
      "Check if your mobile carrier offers free streaming services",
    ],
  },
  community_complaints: [
    {
      complaint: "Difficult to find the cancel button",
      frequency: "High",
      severity: "Medium",
    },
    {
      complaint: "Frequent price increases without warning",
      frequency: "Medium",
      severity: "High",
    },
    {
      complaint: "Content removal without notification",
      frequency: "Medium",
      severity: "Low",
    },
  ],
  cancellation_guide: [
    {
      step: 1,
      instruction: "Log into your Netflix account at netflix.com",
      link: "https://www.netflix.com/login",
    },
    {
      step: 2,
      instruction: "Click on your profile icon in the top right corner",
      link: null,
    },
    {
      step: 3,
      instruction: "Select 'Account' from the dropdown menu",
      link: null,
    },
    {
      step: 4,
      instruction: "Under 'Membership & Billing', click 'Cancel Membership'",
      link: null,
    },
    {
      step: 5,
      instruction: "Confirm cancellation (you may need to click through multiple screens)",
      link: null,
    },
  ],
}

export default function ServiceDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = use(params)

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/trust-center">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trust Center
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold tracking-tight text-balance">{serviceAnalysis.name}</h1>
              <p className="text-lg text-muted-foreground">Detailed trust analysis and cancellation guide</p>
            </div>
            <Badge variant="secondary" className="text-base">
              {serviceAnalysis.category}
            </Badge>
          </div>
        </div>

        {/* Trust Score & Difficulty */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="relative mb-3">
                <svg className="h-24 w-24 -rotate-90 transform">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - serviceAnalysis.trust_score / 100)}`}
                    className="text-primary transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{serviceAnalysis.trust_score}</span>
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Trust Score</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 text-4xl font-bold">${serviceAnalysis.current_price}</div>
              <p className="text-sm font-medium text-muted-foreground">Current Price (Monthly)</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-destructive">
                <TrendingUp className="h-4 w-4" />
                <span>{serviceAnalysis.price_increases} price increases since 2020</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Badge
                className={`mb-3 text-base ${serviceAnalysis.cancellation_difficulty === "easy"
                    ? "bg-primary/20 text-primary"
                    : serviceAnalysis.cancellation_difficulty === "medium"
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "bg-destructive/20 text-destructive"
                  }`}
              >
                {serviceAnalysis.cancellation_difficulty.toUpperCase()}
              </Badge>
              <p className="text-sm font-medium text-muted-foreground">Cancellation Difficulty</p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing History */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>History of Pricing</CardTitle>
            <CardDescription>How {serviceAnalysis.name}'s monthly price has changed over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pricingHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" stroke="currentColor" />
                <YAxis stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="oklch(0.65 0.17 160)"
                  strokeWidth={3}
                  dot={{ fill: "oklch(0.65 0.17 160)", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Recommendation */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI Trust Analyst Recommendation
            </CardTitle>
            <CardDescription>Our AI-powered analysis and verdict</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 font-semibold text-primary">{serviceAnalysis.ai_recommendation.verdict}</h4>
              <p className="text-sm text-muted-foreground">{serviceAnalysis.ai_recommendation.reasoning}</p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Consider these alternatives:</h4>
              <ul className="space-y-2">
                {serviceAnalysis.ai_recommendation.alternative_suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          {/* Community Complaints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Community Pulse
              </CardTitle>
              <CardDescription>Common complaints from users across the web</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceAnalysis.community_complaints.map((complaint, index) => (
                  <div key={index} className="rounded-lg border bg-card/50 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-medium">{complaint.complaint}</p>
                      <Badge
                        variant={complaint.severity === "High" ? "destructive" : "secondary"}
                        className="flex-shrink-0"
                      >
                        {complaint.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Reported frequency: {complaint.frequency}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Evidence Section */}
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  Positive Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {serviceAnalysis.positive_features.map((feature, index) => (
                    <li key={index} className="flex gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {serviceAnalysis.risk_flags.map((risk, index) => (
                    <li key={index} className="flex gap-3 text-sm">
                      <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Step-by-Step Cancellation Guide */}
        <Card>
          <CardHeader>
            <CardTitle>How to Cancel {serviceAnalysis.name}</CardTitle>
            <CardDescription>Follow these steps to cancel your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceAnalysis.cancellation_guide.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {step.step}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="mb-2 text-sm">{step.instruction}</p>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Open link
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
