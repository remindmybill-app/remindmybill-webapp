import type { Metadata } from "next"
import { createClient } from "@/lib/supabase-server"
import { TrustDirectory } from "@/components/trust-center/trust-directory"
import { ShieldCheck, Search, Shield, Info } from "lucide-react"

export const metadata: Metadata = {
  title: "Trust Center — RemindMyBill",
  description: "Transparency into how easy it is to cancel common subscription services. Check trust scores, cancellation methods, and step-by-step guides.",
}

export default async function TrustCenterPage() {
  const supabase = await createClient()

  // Fetch benchmark data
  const { data: services } = await supabase
    .from("service_benchmarks")
    .select("*")
    .order("trust_score", { ascending: false })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground selection:bg-primary/20">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header Section */}
        <div className="max-w-3xl mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="h-3.5 w-3.5" />
            RemindMyBill Transparency
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            The Subscription <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary animate-gradient">Trust Center</span>
          </h1>
          
          <p className="text-xl text-muted-foreground leading-relaxed">
            We track how easy (or hard) it is to cancel common services. 
            Know exactly what you're signing up for with our crowd-sourced and verified benchmarks.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 border border-border/50 px-4 py-2 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              Transparent Cancellation
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 border border-border/50 px-4 py-2 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Verified Data
            </div>
          </div>
        </div>

        {/* Info Card - Why we do this */}
        <div className="mb-12 bg-primary/5 border border-primary/20 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white">Why the Trust Center?</h3>
            <p className="text-muted-foreground text-sm">
              Some services make it intentionally difficult to leave. We believe in "Easy In, Easy Out". 
              Our scores reflect the honesty of a company's cancellation policies.
            </p>
          </div>
        </div>

        {/* Directory Component */}
        <TrustDirectory initialServices={services || []} />

        {/* Footer Note */}
        <div className="mt-24 text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-muted-foreground text-sm bg-card/30 px-6 py-3 rounded-2xl border border-border/50">
            <Info className="h-4 w-4" />
            Missing a service? Our systems scan for new patterns daily.
          </div>
        </div>
      </div>
    </div>
  )
}
