
"use client"

import { useState } from "react"
import { Shield, AlertTriangle, CheckCircle2, Search, ArrowRight, Lock, TrendingUp, AlertCircle, HelpCircle, Globe, Zap, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Types for Trust Analysis
interface TrustAnalysis {
  service_name: string
  trust_score: number
  category: string
  cancellation_difficulty: "easy" | "medium" | "hard"
  dark_patterns: string[]
  positive_features: string[]
  risk_flags: string[]
  trend: "rising" | "stable" | "falling"
  alert_count: number
}

export default function TrustCenterPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<TrustAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!searchQuery) return
    setIsAnalyzing(true)
    setAnalysis(null)
    setError(null)

    try {
      const response = await fetch("/api/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: searchQuery }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze domain")
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      console.error("Analysis error:", err)
      setError("Could not analyze this service. Please try another URL.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 50) return "text-amber-500"
    return "text-rose-500"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10"
    if (score >= 50) return "bg-amber-500/10"
    return "bg-rose-500/10"
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black py-12 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 shadow-xl shadow-zinc-500/20 dark:bg-zinc-800">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">Trust Center</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Exposing hidden dark patterns and cancellation traps using Gemini AI.
          </p>
        </div>

        {/* Search Section */}
        <div className="mx-auto mb-16 max-w-2xl">
          <div className="group relative flex flex-col sm:flex-row gap-3 rounded-3xl bg-white p-2 shadow-2xl shadow-zinc-200 dark:bg-zinc-900 dark:shadow-none ring-1 ring-zinc-200 dark:ring-zinc-800 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Check any service (e.g. adobe.com, netflix.com)"
                className="h-14 border-none bg-transparent pl-12 text-lg focus-visible:ring-0 shadow-none outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !searchQuery}
              size="lg"
              className="h-14 rounded-2xl bg-zinc-900 px-8 text-md font-semibold dark:bg-indigo-600 dark:hover:bg-indigo-700 hover:bg-zinc-800 transition-colors"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Now"}
            </Button>
          </div>
          <p className="mt-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-widest">
            T&C Audit &bull; UX Review &bull; Fee Transparency
          </p>
        </div>

        {/* Global Platform Indicators */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Globe className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Market Benchmark</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold tracking-tight">68 <span className="text-xl font-medium text-zinc-400">/ 100</span></span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Moderate Risk</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Industry average across 1,200+ audited services.</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Fingerprint className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Pattern Alert</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold tracking-tight">Hard</span>
                <Badge variant="outline" className="text-rose-500 border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20">Trend: Rising</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">84% of premium services use "Intentional Friction".</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Safe Sectors</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["Music", "Cloud", "SaaS"].map(tag => (
                  <Badge key={tag} className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-none">{tag}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Categories with highest transparency scores.</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mx-auto max-w-2xl mb-8">
            <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Analysis Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Analysis Result */}
        {analysis && (
          <div className="grid gap-8 lg:grid-cols-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Score Card */}
            <Card className="lg:col-span-4 rounded-3xl border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <CardHeader className="text-center p-8">
                <CardTitle className="text-xl font-bold">Analysis Verdict</CardTitle>
                <CardDescription>Ethical Audit for {analysis.service_name}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-8 pt-0">
                <div className="relative mb-8 flex h-48 w-48 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-zinc-100 dark:text-zinc-800"
                      strokeWidth="6"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className={getScoreColor(analysis.trust_score)}
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - analysis.trust_score / 100)}`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-6xl font-black tracking-tighter ${getScoreColor(analysis.trust_score)}`}>
                      {analysis.trust_score}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Score</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`mb-4 inline-flex px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${getScoreBg(analysis.trust_score)} ${getScoreColor(analysis.trust_score)}`}>
                    {analysis.trust_score >= 80 ? "Trustworthy" : analysis.trust_score >= 50 ? "Be Cautious" : "High Risk"}
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
                    {analysis.trust_score >= 80
                      ? "Top-tier transparency. No dark patterns detected in UX flow."
                      : analysis.trust_score >= 50
                        ? "Noticeable friction in cancellation and auto-renewal terms."
                        : "Significant deceptive patterns detected. Extremely hard to exit."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Details Grid */}
            <div className="lg:col-span-8 space-y-8">
              <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 transition-all hover:bg-white dark:hover:bg-zinc-900 overflow-hidden">
                <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-zinc-800">
                      <Zap className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold leading-none">Pattern Breakdown</CardTitle>
                      <CardDescription className="mt-1">Technical analysis of service behavior</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-8 grid gap-10 sm:grid-cols-2">
                  <div className="space-y-6">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-500">
                        <AlertTriangle className="h-4 w-4" />
                        Deceptive Practices
                      </h4>
                      <ul className="mt-4 space-y-3">
                        {analysis.dark_patterns.length > 0 ? (
                          analysis.dark_patterns.map((pattern, i) => (
                            <li key={i} className="flex items-start gap-3 rounded-xl bg-rose-50/50 p-3 dark:bg-rose-500/5 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10">
                              <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">!</span>
                              <span className="text-sm font-medium text-rose-900/80 dark:text-rose-300/80">{pattern}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground italic">None detected.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" />
                        User Protections
                      </h4>
                      <ul className="mt-4 space-y-3">
                        {analysis.positive_features.length > 0 ? (
                          analysis.positive_features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 rounded-xl bg-emerald-50/50 p-3 dark:bg-emerald-500/5 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                              <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-500" />
                              <span className="text-sm font-medium text-emerald-900/80 dark:text-emerald-300/80">{feature}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground italic">None identified.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>

                <div className="grid grid-cols-2 border-t border-zinc-100 dark:border-zinc-800 divide-x divide-zinc-100 dark:divide-zinc-800">
                  <div className="p-6 text-center">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Exit Difficulty</p>
                    <Badge variant={analysis.cancellation_difficulty === 'easy' ? 'secondary' : 'destructive'} className="rounded-md font-bold">
                      {analysis.cancellation_difficulty.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Service Trend</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-white flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      {analysis.trend.toUpperCase()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Educational Content */}
        {!analysis && (
          <div className="mt-20 grid gap-10 md:grid-cols-3">
            {[
              {
                icon: AlertTriangle,
                title: "Dark Patterns",
                desc: "We scan for fake countdowns, hidden exit buttons, and monthly traps.",
                color: "text-rose-500",
                bg: "bg-rose-50 dark:bg-rose-500/10"
              },
              {
                icon: Lock,
                title: "Verified Audit",
                desc: "AI scans 50+ pages of T&Cs to find the small print that costs you money.",
                color: "text-indigo-500",
                bg: "bg-indigo-50 dark:bg-indigo-500/10"
              },
              {
                icon: Shield,
                title: "User Shield",
                desc: "Data is crowdsourced and validated against real manual cancellation attempts.",
                color: "text-emerald-500",
                bg: "bg-emerald-50 dark:bg-emerald-500/10"
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center group transition-transform hover:-translate-y-1">
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} shadow-sm transition-all group-hover:shadow-md`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground px-4">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
