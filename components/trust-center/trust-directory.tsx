"use client"

import { useState, useMemo } from "react"
import { Search, Filter, ArrowUpDown, ExternalLink, ShieldCheck, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

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
}

export function TrustDirectory({ initialServices }: TrustDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState<"score" | "difficulty">("score")
  const [selectedService, setSelectedService] = useState<ServiceBenchmark | null>(null)

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
        if (sortBy === "score") {
          return b.trust_score - a.trust_score
        } else {
          // Hardest to cancel (Impossible > Hard > Medium > Easy)
          const difficultyMap = { Impossible: 4, Hard: 3, Medium: 2, Easy: 1 }
          return difficultyMap[b.difficulty_level] - difficultyMap[a.difficulty_level]
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

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="flex flex-col gap-6 sticky top-16 z-30 bg-background/95 backdrop-blur py-4 -mx-4 px-4 border-b border-border/40">
        <div className="relative max-w-2xl mx-auto w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscription services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-card border-border/50 focus:border-primary/50 transition-all rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2">
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy(sortBy === "score" ? "difficulty" : "score")}
            className="gap-2 rounded-full border-border/50"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort by: {sortBy === "score" ? "Most Trusted" : "Hardest to Cancel"}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
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

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Method</p>
                      <p className="font-semibold">{selectedService.cancellation_method || "Online"}</p>
                    </div>
                    {selectedService.website_url && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Website</p>
                        <a
                          href={selectedService.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          Visit Site <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedService.cancellation_steps && selectedService.cancellation_steps.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    How to cancel
                  </h4>
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
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {selectedService.cancellation_url && (
                  <Button asChild className="flex-1 h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20">
                    <a href={selectedService.cancellation_url} target="_blank" rel="noopener noreferrer">
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
    </div>
  )
}
