"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, AlertTriangle, CheckCircle2, Search, ArrowRight, Lock, TrendingUp, AlertCircle, HelpCircle, Globe, Zap, Fingerprint, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { debounce } from "lodash"
import { motion, AnimatePresence } from "framer-motion"
import { analyzeCompanySafety } from "@/app/actions/trust-ai"
import { requestReview } from "@/app/actions/service-request"
import { RequestReviewModal } from "@/components/trust-center/request-review-modal"

// Updated Interface to match 'service_benchmarks' table
interface Platform {
  id: string
  name: string
  category: string
  // New columns from migration
  trust_score: number
  difficulty_level: "Easy" | "Medium" | "Hard" | "Impossible"
  cancellation_method: string
  website_url?: string
}

interface TrustAnalysis {
  service_name: string
  trust_score: number
  category: string
  cancellation_difficulty: "Easy" | "Medium" | "Hard" | "Impossible"
  dark_patterns: string[]
  positive_features: string[]
  risk_flags: string[]
  trend: "rising" | "stable" | "falling"
  alert_count: number
  cancellation_url?: string
  cancellation_method?: string
}

export default function TrustCenterPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<TrustAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Platform[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Leaderboard State
  const [trustedServices, setTrustedServices] = useState<Platform[]>([])
  const [riskyServices, setRiskyServices] = useState<Platform[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestServiceName, setRequestServiceName] = useState("")

  const supabase = getSupabaseBrowserClient()

  // Fetch Leaderboards on Mount
  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        const { data: trusted } = await supabase
          .from('service_benchmarks')
          .select('*')
          .gte('trust_score', 80)
          .order('trust_score', { ascending: false })
          .limit(20)

        const { data: risky } = await supabase
          .from('service_benchmarks')
          .select('*')
          .lte('trust_score', 50)
          .order('trust_score', { ascending: true })
          .limit(20)

        if (trusted) setTrustedServices(trusted as any)
        if (risky) setRiskyServices(risky as any)
      } catch (e) {
        console.error("Failed to fetch leaderboards", e)
      } finally {
        setLoadingLeaderboard(false)
      }
    }

    fetchLeaderboards()
  }, [])

  // Debounced Search
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        const { data, error } = await supabase
          .from('service_benchmarks')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(5)

        if (error) throw error
        setSearchResults(data as any || [])
      } catch (err) {
        console.error("Search error:", err)
      } finally {
        setIsSearching(false)
      }
    }, 300),
    []
  )

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    performSearch(val)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setIsSearching(false)
  }

  const handleSelectService = (service: Platform) => {
    // Generate analysis based on DB data
    const isHard = service.difficulty_level === 'Hard' || service.difficulty_level === 'Impossible';
    const isEasy = service.difficulty_level === 'Easy';

    setAnalysis({
      service_name: service.name,
      trust_score: service.trust_score,
      category: service.category || "Subscription",
      cancellation_difficulty: service.difficulty_level,
      dark_patterns: isHard ? ["Potential Forced Phone Call", "Hidden Cancellation Link", "Retention Scripts"] : [],
      positive_features: isEasy ? ["Online Cancellation", "Clear Terms", "No Hidden Fees"] : [],
      risk_flags: [],
      trend: service.trust_score < 50 ? "falling" : "stable",
      alert_count: 0,
      cancellation_url: service.website_url,
      cancellation_method: service.cancellation_method
    })
    setSearchQuery("")
    setSearchResults([])
    setIsAnalyzing(false)
  }


  const handleAnalyze = async () => {
    // If not selected from dropdown, try to find exact match or run AI
    if (!searchQuery) return
    setIsAnalyzing(true)
    setAnalysis(null)
    setError(null)

    try {
      // First check DB for exact match
      const { data: dbMatch } = await supabase
        .from('service_benchmarks')
        .select('*')
        .ilike('name', searchQuery)
        .single()

      if (dbMatch) {
        handleSelectService(dbMatch as any)
        return;
      }

      if (searchResults.length === 0) {
        setError(`No verified data found for "${searchQuery}".`)
      }
    } catch (err: any) {
      console.error("Analysis error (fallback triggered):", err)
      setAnalysis(null)
      if (err.message?.includes("unavailable") || err.isQuotaExceeded) {
        toast.info("AI Analysis on Break", {
          description: "We've hit our daily AI limit. Reverting to database search."
        })
      } else {
        toast.error("Analysis unavailable", {
          description: "We couldn't reach the AI analyst. Reverting to database search."
        })
      }
      if (searchResults.length === 0) {
        setError(`No verified data found for "${searchQuery}".`)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 50) return "text-amber-500"
    return "text-red-400 font-bold"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/10"
    if (score >= 50) return "bg-amber-500/10"
    return "bg-rose-500/10"
  }

  return (
    <div className="bg-background py-12 sm:py-20 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* HERO SECTION */}
        <div className="mb-16">
          <div className="mb-12 text-center">
            {/* RADAR SCAN ANIMATION — replaces shield icon */}
            <div className="mx-auto mb-10 relative flex h-40 w-40 items-center justify-center">

              {/* Static concentric rings */}
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-primary/15"
                  style={{ width: `${i * 22}%`, height: `${i * 22}%` }}
                />
              ))}

              {/* Rotating sweep arm */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ transformOrigin: "center center" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                {/* Sweep gradient wedge */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.25) 60deg, hsl(var(--primary) / 0.05) 90deg, transparent 90deg)",
                  }}
                />
                {/* Leading edge dot (the "beam tip") */}
                <div
                  className="absolute top-[50%] left-[50%] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_2px_hsl(var(--primary)/0.6)]"
                  style={{ transformOrigin: "left center", width: "50%" }}
                />
              </motion.div>

              {/* Blip dots — simulating detected targets */}
              {[
                { top: "22%", left: "62%", delay: 0.8, color: "bg-emerald-400" },
                { top: "60%", left: "28%", delay: 1.6, color: "bg-rose-400" },
                { top: "70%", left: "65%", delay: 2.4, color: "bg-amber-400" },
              ].map((blip, i) => (
                <motion.div
                  key={i}
                  className={`absolute h-2 w-2 rounded-full ${blip.color} shadow-[0_0_8px_2px_currentColor]`}
                  style={{ top: blip.top, left: blip.left }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.5] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: blip.delay,
                    ease: "easeInOut",
                  }}
                />
              ))}

              {/* Center crosshair dot */}
              <div className="relative z-10 h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_4px_hsl(var(--primary)/0.5)]" />

              {/* Outer ring border */}
              <div className="absolute inset-0 rounded-full border border-primary/25" />
            </div>


            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Trust Center</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Exposing hidden dark patterns and cancellation traps using our verified database.
            </p>
          </div>

          {/* Search Section */}
          <div className="mx-auto max-w-2xl relative z-20">
            <div className="group relative rounded-3xl bg-card p-2 shadow-2xl border border-border focus-within:ring-2 focus-within:ring-primary/50 transition-all">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Check any service (e.g. Netflix, Adobe)"
                  className="h-14 border-none bg-transparent pl-12 text-lg focus-visible:ring-0 shadow-none outline-none w-full"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />

                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent text-muted-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {searchQuery.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 w-full rounded-2xl border border-border bg-card p-2 shadow-xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                      <div className="p-4 flex justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectService(result)}
                          className="flex w-full items-center justify-between rounded-xl p-3 hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {result.name.substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-medium text-foreground block">{result.name}</span>
                              <span className="text-xs text-muted-foreground">{result.category}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={`${result.difficulty_level === 'Easy' ? "text-emerald-500 border-emerald-200"
                            : result.difficulty_level === 'Medium' ? "text-amber-500 border-amber-200"
                              : "text-rose-500 border-rose-200"
                            }`}>
                            {result.difficulty_level}
                          </Badge>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                          No verified matches for "{searchQuery}".
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-dashed"
                          onClick={() => {
                            setRequestServiceName(searchQuery)
                            setIsRequestModalOpen(true)
                          }}
                        >
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Request to add "{searchQuery}"
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-widest">
              T&C Audit &bull; UX Review &bull; Fee Transparency
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mx-auto max-w-2xl mt-8">
              <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Analysis Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* ANALYSIS RESULT */}
          <AnimatePresence>
            {analysis && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className="mt-12 overflow-hidden"
              >
                <div className="grid gap-8 lg:grid-cols-12">
                  <Card className="lg:col-span-4 rounded-3xl border-border bg-card shadow-xl">
                    <CardHeader className="text-center p-8">
                      <CardTitle className="text-xl font-bold">Analysis Verdict</CardTitle>
                      <CardDescription>Ethical Audit for {analysis.service_name}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-8 pt-0">
                      <div className="relative mb-8 flex h-48 w-48 items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                          <circle className="text-zinc-100 dark:text-zinc-800" strokeWidth="6" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                          <circle className={getScoreColor(analysis.trust_score)} strokeWidth="8" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - analysis.trust_score / 100)}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className={`text-6xl font-black tracking-tighter ${getScoreColor(analysis.trust_score)}`}>{analysis.trust_score}</span>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Score</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`mb-4 inline-flex px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${getScoreBg(analysis.trust_score)} ${getScoreColor(analysis.trust_score)}`}>
                          {analysis.trust_score >= 80 ? "Trustworthy" : analysis.trust_score >= 50 ? "Be Cautious" : "High Risk"}
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-zinc-400 px-4">
                          {analysis.trust_score >= 80 ? "Top-tier transparency. No dark patterns detected." : analysis.trust_score >= 50 ? "Noticeable friction in cancellation." : "Significant deceptive patterns detected."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="lg:col-span-8 space-y-8">
                    <Card className="rounded-3xl border-border bg-card shadow-sm">
                      <CardHeader className="p-8 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shadow-sm">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold leading-none text-foreground">Pattern Breakdown</CardTitle>
                            <CardDescription className="mt-1 text-muted-foreground">Technical analysis of service behavior</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 pt-8 grid gap-10 sm:grid-cols-2">
                        <div className="space-y-6">
                          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-500"><AlertTriangle className="h-4 w-4" /> Deceptive Practices</h4>
                          <ul className="space-y-3">
                            {analysis.dark_patterns.length > 0 ? analysis.dark_patterns.map((p, i) => (
                              <li key={i} className="flex items-start gap-3 rounded-xl bg-rose-50/50 p-3 dark:bg-rose-500/5 text-sm font-medium text-rose-900/80 dark:text-rose-300/80"><span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">!</span>{p}</li>
                            )) : <li className="text-sm text-muted-foreground italic">None detected.</li>}
                          </ul>
                        </div>
                        <div className="space-y-6">
                          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-500"><CheckCircle2 className="h-4 w-4" /> User Protections</h4>
                          <ul className="space-y-3">
                            {analysis.positive_features.length > 0 ? analysis.positive_features.map((p, i) => (
                              <li key={i} className="flex items-start gap-3 rounded-xl bg-emerald-50/50 p-3 dark:bg-emerald-500/5 text-sm font-medium text-emerald-900/80 dark:text-emerald-300/80"><CheckCircle2 className="mt-1 h-4 w-4 text-emerald-500" />{p}</li>
                            )) : <li className="text-sm text-muted-foreground italic">None identified.</li>}
                          </ul>
                        </div>
                      </CardContent>
                      <div className="grid grid-cols-2 border-t border-border divide-x divide-border">
                        <div className="p-6 text-center">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Exit Difficulty</p>
                          <Badge variant={analysis.cancellation_difficulty.toLowerCase() === 'easy' ? 'secondary' : 'destructive'} className="rounded-md font-bold">
                            {analysis.cancellation_difficulty.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="p-6 text-center">
                          {analysis.cancellation_url && <Button asChild size="sm" variant="outline" className="w-full"><a href={analysis.cancellation_url} target="_blank" rel="noopener noreferrer">Direct Cancel Link <ArrowRight className="ml-2 h-4 w-4" /></a></Button>}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ALWAYS SHOW LEADERBOARDS (Filtered by Search) */}
        <div className="mt-16">
          <div className="grid gap-8 lg:grid-cols-2 mb-16 items-start">
            {/* Top Trusted */}
            <div className="rounded-3xl border border-border bg-card shadow-sm p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-2xl">🏆</span> Trusted Services
                </h2>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Safe
                </Badge>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingLeaderboard ? (
                  [1, 2, 3].map(i => <div key={i} className="h-16 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)
                ) : trustedServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No matches in Trusted list.</div>
                ) : (
                  trustedServices
                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((service) => (
                      <div key={service.id} className="group flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4 transition-all hover:bg-card hover:shadow-md" onClick={() => handleSelectService(service)}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                            {service.name.substring(0, 1)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{service.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{service.category || 'Subscription'}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{service.trust_score}</span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">/100</span>
                          </div>
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400">
                            {service.difficulty_level}
                          </Badge>
                        </div>
                      </div>
                    )))}
              </div>
            </div>

            {/* Hall of Shame */}
            <div className="rounded-3xl border border-border bg-card shadow-sm p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-2xl">⚠️</span> High Risk Services
                </h2>
                <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                  Risky
                </Badge>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingLeaderboard ? (
                  [1, 2, 3].map(i => <div key={i} className="h-16 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)
                ) : riskyServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No matches in High Risk list.</div>
                ) : (
                  riskyServices
                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((service) => (
                      <div key={service.id} className="group flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/10 p-4 transition-all hover:bg-rose-50 hover:shadow-md dark:border-rose-900/30 dark:bg-rose-950/20 dark:hover:bg-rose-900/30" onClick={() => handleSelectService(service)}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-sm">
                            {service.name.substring(0, 1)}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-50">{service.name}</p>
                            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 line-clamp-1">{service.cancellation_method || 'Phone Call Required'}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{service.trust_score}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">/100</span>
                          </div>
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider border-rose-200 text-rose-600 dark:border-rose-800 dark:text-rose-400">
                            {service.difficulty_level}
                          </Badge>
                        </div>
                      </div>
                    )))}
              </div>
            </div>
          </div>

          {/* Educational Content */}
          <div className="mt-20 grid gap-10 md:grid-cols-3">
            {[
              { icon: AlertTriangle, title: "Dark Patterns", desc: "We scan for fake countdowns, hidden exit buttons, and monthly traps.", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
              { icon: Lock, title: "Verified Audit", desc: "AI scans 50+ pages of T&Cs to find the small print that costs you money.", color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
              { icon: Shield, title: "User Shield", desc: "Data is crowdsourced and validated against real manual cancellation attempts.", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center group transition-transform hover:-translate-y-1">
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} shadow-sm transition-all group-hover:shadow-md`}><feature.icon className={`h-6 w-6 ${feature.color}`} /></div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground px-4">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Request Service Modal */}
        <RequestReviewModal
          open={isRequestModalOpen}
          onOpenChange={setIsRequestModalOpen}
          defaultServiceName={requestServiceName}
        />
      </div>
    </div>
  )
}
