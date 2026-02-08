"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, AlertTriangle, CheckCircle2, Search, ArrowRight, Lock, TrendingUp, AlertCircle, HelpCircle, Globe, Zap, Fingerprint, Loader2 } from "lucide-react"
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
import { submitServiceRequest } from "@/app/actions/service-request"

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
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

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
          .limit(10)

        const { data: risky } = await supabase
          .from('service_benchmarks')
          .select('*')
          .lte('trust_score', 40)
          .order('trust_score', { ascending: true })
          .limit(10)

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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestServiceName) return

    setIsSubmittingRequest(true)

    try {
      const result = await submitServiceRequest(requestServiceName)

      if (result.success) {
        toast.success("Request sent!", {
          description: `We'll audit ${requestServiceName} and add it to our database shortly.`
        })
        setRequestServiceName("")
        setIsRequestModalOpen(false)
      } else {
        toast.error("Request failed", {
          description: result.error || "Could not submit your request."
        })
      }
    } catch (err) {
      console.error("Request submission error:", err)
      toast.error("Something went wrong", {
        description: "Please try again later."
      })
    } finally {
      setIsSubmittingRequest(false)
    }
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

      // If not in DB, fall back to AI
      const result = await analyzeCompanySafety(searchQuery)

      if (!result.success) {
        throw new Error(result.error)
      }

      setAnalysis(result.data as any)

      if (result.source === 'ai') {
        toast.success("AI Analysis Complete", {
          description: `Generated a real-time safety report for ${searchQuery}`
        })
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
    <div className="bg-zinc-50/50 dark:bg-black py-12 sm:py-20 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* HERO SECTION */}
        <div className="mb-16">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 shadow-xl shadow-zinc-500/20 dark:bg-zinc-800">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">Trust Center</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Exposing hidden dark patterns and cancellation traps using our verified database.
            </p>
          </div>

          {/* Search Section */}
          <div className="mx-auto max-w-2xl relative z-20">
            <div className="group relative rounded-3xl bg-white p-2 shadow-2xl shadow-zinc-200 dark:bg-zinc-900 dark:shadow-none ring-1 ring-zinc-200 dark:ring-zinc-800 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Check any service (e.g. Netflix, Adobe)"
                  className="h-14 border-none bg-transparent pl-12 text-lg focus-visible:ring-0 shadow-none outline-none w-full"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />

                {searchQuery.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 z-50 max-h-[300px] overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 flex justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectService(result)}
                          className="flex w-full items-center justify-between rounded-xl p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                              {result.name.substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-medium text-zinc-900 dark:text-zinc-50 block">{result.name}</span>
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
                  <Card className="lg:col-span-4 rounded-3xl border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
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
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Score</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`mb-4 inline-flex px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${getScoreBg(analysis.trust_score)} ${getScoreColor(analysis.trust_score)}`}>
                          {analysis.trust_score >= 80 ? "Trustworthy" : analysis.trust_score >= 50 ? "Be Cautious" : "High Risk"}
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground px-4">
                          {analysis.trust_score >= 80 ? "Top-tier transparency. No dark patterns detected." : analysis.trust_score >= 50 ? "Noticeable friction in cancellation." : "Significant deceptive patterns detected."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="lg:col-span-8 space-y-8">
                    <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
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
                      <div className="grid grid-cols-2 border-t border-zinc-100 dark:border-zinc-800 divide-x divide-zinc-100 dark:divide-zinc-800">
                        <div className="p-6 text-center">
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Exit Difficulty</p>
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

        {/* ONLY SHOW THESE IF NO ANALYSIS ACTIVE */}
        {!analysis && (
          <>
            {/* Trust Leaderboards */}
            <div className="grid gap-8 lg:grid-cols-2 mb-16">
              {/* Top Trusted */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2"><span className="text-2xl">🏆</span> Top Trusted Services</h2>
                </div>
                <div className="space-y-3">
                  {loadingLeaderboard ? [1, 2, 3].map(i => <div key={i} className="h-16 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />) : trustedServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-500/10"><span className="text-emerald-700 font-bold dark:text-emerald-400">{service.name[0]}</span></div>
                        <div><p className="font-bold">{service.name}</p><p className="text-xs text-muted-foreground">{service.cancellation_method || 'Verified Easy'}</p></div>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-emerald-600 dark:text-emerald-400">{service.trust_score}/100</span>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 text-[10px]">{service.difficulty_level}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hall of Shame */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2"><span className="text-2xl">⚠️</span> High Risk / Hard to Cancel</h2>
                </div>
                <div className="space-y-3">
                  {loadingLeaderboard ? [1, 2, 3].map(i => <div key={i} className="h-16 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />) : riskyServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/30 p-4 shadow-sm dark:border-rose-900/20 dark:bg-rose-950/10">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center dark:bg-rose-500/10"><span className="text-rose-700 font-bold dark:text-rose-400">{service.name[0]}</span></div>
                        <div><p className="font-bold">{service.name}</p><Badge variant="outline" className="border-rose-200 text-rose-600 dark:border-rose-800 dark:text-rose-400 text-[10px] h-5">{service.difficulty_level}</Badge></div>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-rose-600 dark:text-rose-300">{service.trust_score}/100</span>
                      </div>
                    </div>
                  ))}
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
                  <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground px-4">{feature.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Request Service Modal */}
        <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Request a Service</DialogTitle>
              <DialogDescription>Don't see a service? Let us know and we'll audit it for dark patterns.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRequestSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="service-name" className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Service Name</label>
                <Input id="service-name" placeholder="e.g. Paramount+, New York Times" value={requestServiceName} onChange={(e) => setRequestServiceName(e.target.value)} className="h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" required autoFocus />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xl" disabled={isSubmittingRequest || !requestServiceName}>
                  {isSubmittingRequest ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Submit Request"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
