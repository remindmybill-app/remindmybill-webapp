"use client"

import { useState, useMemo } from "react"
import { Search, Filter, ArrowUpDown, ExternalLink, ShieldCheck, X, ChevronDown, AlertTriangle, Plus, ChevronRight, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ServiceBenchmark {
  id: string
  name: string
  difficulty_level: "Easy" | "Medium" | "Hard" | "Impossible"
  cancellation_method: string | null
  trust_score: number
  category: string
  website_url: string | null
  cancellation_steps: string[] | null
  cancellation_url: string | null
}

interface TrustDirectoryProps {
  initialServices: ServiceBenchmark[]
  highRiskServices: ServiceBenchmark[]
}

export function TrustDirectory({ initialServices, highRiskServices }: TrustDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState<string>("most_trusted")
  const [selectedService, setSelectedService] = useState<ServiceBenchmark | null>(null)
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAll, setShowAll] = useState(false)
  
  // Suggest form state
  const [suggestForm, setSuggestForm] = useState({
    name: "",
    website_url: "",
    category: "",
    reason: ""
  })

  const categories = useMemo(() => {
    const cats = new Set(initialServices.map((s) => s.category))
    return ["All", ...Array.from(cats).sort()]
  }, [initialServices])

  const filteredServices = useMemo(() => {
    return initialServices
      .filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === "All" || s.category === selectedCategory
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        const difficultyMap: Record<string, number> = { "Very Hard": 5, Impossible: 4, Hard: 3, Medium: 2, Easy: 1 }
        
        switch (sortBy) {
          case "most_trusted":
            return b.trust_score - a.trust_score
          case "lowest_score":
            return a.trust_score - b.trust_score
          case "hardest":
            return (difficultyMap[b.difficulty_level] || 0) - (difficultyMap[a.difficulty_level] || 0)
          case "easiest":
            return (difficultyMap[a.difficulty_level] || 0) - (difficultyMap[b.difficulty_level] || 0)
          default:
            return 0
        }
      })
  }, [initialServices, searchQuery, selectedCategory, sortBy])

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500"
    if (score >= 50) return "text-amber-500"
    return "text-red-500"
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "Easy": return "text-green-500 bg-green-500/10 border-green-500/20"
      case "Medium": return "text-amber-500 bg-amber-500/10 border-amber-500/20"
      case "Hard":
      case "Impossible":
      case "Very Hard": return "text-red-500 bg-red-500/10 border-red-500/20"
      default: return "text-muted-foreground"
    }
  }

  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suggestForm.name) return
    
    setIsSubmitting(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase
        .from("service_suggestions")
        .insert([
          {
            name: suggestForm.name,
            website_url: suggestForm.website_url || null,
            category: suggestForm.category || null,
            reason: suggestForm.reason || null,
            status: "pending"
          }
        ])

      if (error) throw error

      toast.success("Thanks! We'll review your suggestion.")
      setIsSuggestModalOpen(false)
      setSuggestForm({ name: "", website_url: "", category: "", reason: "" })
    } catch (error) {
      console.error("Submission error:", error)
      toast.error("Failed to submit suggestion. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* High Risk Section */}
      {highRiskServices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold">High Risk Subscriptions</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
            {highRiskServices.map((service) => (
              <div 
                key={service.id}
                className="flex-shrink-0 w-[280px] snap-start p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-red-950 dark:text-foreground truncate pr-2">{service.name}</h3>
                  <span className="text-red-600 dark:text-red-500 font-black tracking-tighter">{service.trust_score}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={cn("text-[10px] px-1.5 py-0 border", getDifficultyColor(service.difficulty_level))}>
                    {service.difficulty_level}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground pb-2">
                  <span className="font-semibold block mb-0.5 opacity-70 uppercase tracking-widest text-[9px]">Method</span>
                  {service.cancellation_method || "N/A"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg h-8 text-xs font-bold transition-colors"
                  onClick={() => setSelectedService(service)}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70">
            ⚠️ These services have been flagged as difficult to cancel or use dark patterns.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-6 sticky top-16 z-30 bg-background py-4 -mx-4 px-4 border-b border-border">
        <div className="relative max-w-2xl mx-auto w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscription services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-card border-border/50 focus:border-primary/50 transition-all rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
             <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
             <Select value={sortBy} onValueChange={setSortBy}>
               <SelectTrigger className="w-[180px] h-9 rounded-full bg-card border-border/50">
                 <SelectValue placeholder="Sort by" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="most_trusted">Most Trusted</SelectItem>
                 <SelectItem value="lowest_score">Lowest Score First</SelectItem>
                 <SelectItem value="hardest">Hardest to Cancel</SelectItem>
                 <SelectItem value="easiest">Easiest to Cancel</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </div>

        {/* Calculation Breakdown */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="how-it-works" className="border-none">
            <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:no-underline hover:text-foreground transition-colors justify-start gap-2">
              <Info className="h-4 w-4" />
              How is the Trust Score calculated?
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground space-y-3">
                <p className="font-semibold text-foreground">Trust Score is calculated from 0–100 based on:</p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✅ +5</span>
                    <span>Instant cancellation with immediate confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌ -5</span>
                    <span>No direct cancellation URL available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌ -10</span>
                    <span>No self-service cancellation (must contact support)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌ -10</span>
                    <span>Cancellation difficulty rated Hard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌ -20</span>
                    <span>Cancellation difficulty rated Very Hard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌ -15</span>
                    <span>Known for dark patterns (surprise charges, hidden auto-renewal)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌ -15</span>
                    <span>Requires live chat with retention agent to cancel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌ -20</span>
                    <span>Requires phone call to cancel</span>
                  </div>
                </div>
                <p className="pt-2 border-t border-border/50 text-xs italic">
                  Scores are researched and verified. Higher = safer subscription.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Grid */}
      {filteredServices.length > 0 ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.slice(0, showAll ? filteredServices.length : 12).map((service) => (
            <div
              key={service.id}
              className="group flex flex-col bg-card border border-border/50 rounded-2xl p-6 transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{service.name}</h3>
                  <Badge variant="secondary" className="bg-muted/50 text-muted-foreground font-normal">
                    {service.category}
                  </Badge>
                </div>
                <div className={cn("text-2xl font-black tracking-tighter", getScoreColor(service.trust_score))}>
                  {service.trust_score}
                </div>
              </div>

              <div className="space-y-4 mb-6 flex-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Difficulty</span>
                  <Badge className={cn("border", getDifficultyColor(service.difficulty_level))}>
                    {service.difficulty_level}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Cancellation</span>
                  <span className="text-foreground font-medium">{service.cancellation_method || "N/A"}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-xl"
                onClick={() => setSelectedService(service)}
              >
                View Details
              </Button>
            </div>
          ))}
          </div>

          {filteredServices.length > 12 && (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => setShowAll(!showAll)}
                className="gap-2 rounded-full border-border hover:bg-muted"
              >
                {showAll ? (
                  <>Show Less</>
                ) : (
                  <>View All {filteredServices.length} Services <ChevronDown className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-24 bg-card/30 rounded-3xl border border-dashed border-border/50">
          <div className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50">
            <Filter className="h-full w-full" />
          </div>
          <p className="text-muted-foreground text-lg mb-2">We don't have data on this service yet.</p>
          <p className="text-primary font-medium">Our AI is working on it.</p>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <DialogContent className="max-w-2xl bg-card border-border/50 rounded-3xl sm:rounded-3xl">
          {selectedService && (
            <div className="space-y-8 pt-4">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                {/* Score Ring */}
                <div className="relative h-32 w-32 flex-shrink-0">
                  <svg className="h-full w-full drop-shadow-sm" viewBox="0 0 100 100">
                    <circle
                      className="text-muted/20"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className={cn(getScoreColor(selectedService.trust_score), "transition-all duration-1000 ease-out")}
                      strokeWidth="8"
                      strokeDasharray={42 * 2 * Math.PI}
                      strokeDashoffset={42 * 2 * Math.PI * (1 - selectedService.trust_score / 100)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black leading-none">{selectedService.trust_score}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Score</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight">{selectedService.name}</h2>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        {selectedService.category}
                      </Badge>
                      <Badge className={cn("border", getDifficultyColor(selectedService.difficulty_level))}>
                        {selectedService.difficulty_level}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Method</p>
                  <p className="font-semibold">{selectedService.cancellation_method || "Online"}</p>
                </div>
                {selectedService.website_url && selectedService.website_url.trim() !== "" && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Website</p>
                    <a
                      href={selectedService.website_url.startsWith('http') ? selectedService.website_url : `https://${selectedService.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Visit Site <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  How to cancel
                </h4>
                {selectedService.cancellation_steps && selectedService.cancellation_steps.length > 0 ? (
                  <ol className="space-y-3">
                    {selectedService.cancellation_steps.map((step, index) => (
                      <li key={index} className="flex gap-4 group">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-foreground/90">{step}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No step-by-step guide available yet.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {selectedService.cancellation_url && 
                 selectedService.cancellation_url.trim() !== "" && 
                 !selectedService.cancellation_url.toLowerCase().includes("example.com") && (
                  <Button asChild className="flex-1 h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20">
                    <a href={selectedService.cancellation_url.startsWith('http') ? selectedService.cancellation_url : `https://${selectedService.cancellation_url}`} target="_blank" rel="noopener noreferrer">
                      Cancel This Subscription →
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-border/50 bg-muted/30"
                  onClick={() => setSelectedService(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suggest a Service Feature */}
      <div className="mt-12 text-center">
        <Button 
          variant="outline" 
          onClick={() => setIsSuggestModalOpen(true)}
          className="gap-2 rounded-full border-primary/20 hover:border-primary/50 text-primary"
        >
          Don't see a service? Suggest it <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isSuggestModalOpen} onOpenChange={setIsSuggestModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border/50 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Suggest a Service</DialogTitle>
            <DialogDescription>
              Help us expand the Trust Center. Suggest a service you'd like us to research.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSuggestSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name"
                  placeholder="e.g., Netflix, Adobe, Planet Fitness"
                  required
                  value={suggestForm.name}
                  onChange={(e) => setSuggestForm({ ...suggestForm, name: e.target.value })}
                  className="bg-muted/50 border-border/50 focus:border-primary/50 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website URL (optional)</Label>
                <Input 
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={suggestForm.website_url}
                  onChange={(e) => setSuggestForm({ ...suggestForm, website_url: e.target.value })}
                  className="bg-muted/50 border-border/50 focus:border-primary/50 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={suggestForm.category} 
                  onValueChange={(val) => setSuggestForm({ ...suggestForm, category: val })}
                >
                  <SelectTrigger className="bg-muted/50 border-border/50 rounded-xl">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== "All").map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Why should it be added? (optional)</Label>
                <Textarea 
                  id="reason"
                  placeholder="Tell us about the cancellation experience..."
                  maxLength={200}
                  value={suggestForm.reason}
                  onChange={(e) => setSuggestForm({ ...suggestForm, reason: e.target.value })}
                  className="bg-muted/50 border-border/50 focus:border-primary/50 rounded-xl min-h-[100px]"
                />
                <div className="text-[10px] text-right text-muted-foreground">
                  {suggestForm.reason.length}/200
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsSuggestModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="rounded-xl px-8"
              >
                {isSubmitting ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
