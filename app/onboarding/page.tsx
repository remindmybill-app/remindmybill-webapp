"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Shield, Mail, Sparkles, CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const steps = [
  {
    id: 1,
    title: "Welcome to SubGuard",
    description: "Let's find your hidden subscriptions",
  },
  {
    id: 2,
    title: "Connect Your Gmail",
    description: "We'll scan for subscription receipts",
  },
  {
    id: 3,
    title: "Analyzing Your Subscriptions",
    description: "Please wait while we process your data",
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStatus, setScanStatus] = useState("Preparing to scan...")

  const handleConnectGmail = async () => {
    console.log("[v0] Connecting to Gmail...")
    setIsConnecting(true)

    try {
      const supabase = getSupabaseBrowserClient()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/gmail.readonly",
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding&step=3`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.error("[v0] Error connecting Gmail:", error)
        setIsConnecting(false)
        return
      }

      console.log("[v0] Gmail connected successfully")
    } catch (error) {
      console.error("[v0] Failed to connect Gmail:", error)
      setIsConnecting(false)
    }
  }

  const startScan = async () => {
    setIsScanning(true)

    const scanSteps = [
      { progress: 20, status: "Connecting to your inbox..." },
      { progress: 40, status: "Scanning invoices..." },
      { progress: 60, status: "Calculating trust scores..." },
      { progress: 80, status: "Detecting renewal dates..." },
      { progress: 100, status: "Finalizing your dashboard..." },
    ]

    for (const step of scanSteps) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setScanProgress(step.progress)
      setScanStatus(step.status)
      console.log("[v0]", step.status)
    }

    try {
      const supabase = getSupabaseBrowserClient()

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("scan-inbox", {
        body: { action: "initial_scan" },
      })

      if (error) {
        console.error("[v0] Error during initial scan:", error)
      } else {
        console.log("[v0] Initial scan complete:", data)
      }
    } catch (error) {
      console.error("[v0] Failed to scan inbox:", error)
    }

    // Redirect to dashboard after scan completes
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("[v0] Scan complete, redirecting to dashboard")
    router.push("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="mb-4 flex justify-between">
            {steps.map((step) => (
              <div key={step.id} className={`flex items-center ${step.id !== steps.length ? "flex-1" : ""}`}>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    currentStep >= step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                </div>
                {step.id !== steps.length && (
                  <div
                    className={`mx-2 h-0.5 flex-1 transition-colors ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </p>
        </div>

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl">Welcome to SubGuard</CardTitle>
              <CardDescription className="text-lg">Let's find your hidden subscriptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Discover Hidden Subscriptions</p>
                    <p className="text-sm text-muted-foreground">
                      We'll scan your email to find all your active subscriptions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Analyze Trust Scores</p>
                    <p className="text-sm text-muted-foreground">
                      Get detailed insights on cancellation difficulty and dark patterns
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Save Money</p>
                    <p className="text-sm text-muted-foreground">
                      Identify unused subscriptions and optimize your spending
                    </p>
                  </div>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => setCurrentStep(2)}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Connect Gmail */}
        {currentStep === 2 && (
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl">Connect Your Gmail</CardTitle>
              <CardDescription className="text-lg">We'll scan for subscription receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <Shield className="h-5 w-5" />
                  <p className="font-semibold">Your Privacy is Protected</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    We only scan email headers, never your private messages
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    We look for subscription receipts and billing notifications
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    All data is encrypted and stored securely
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    You can disconnect at any time from Settings
                  </li>
                </ul>
              </div>
              <Button className="w-full" size="lg" onClick={handleConnectGmail} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting to Gmail...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-5 w-5" />
                    Connect Gmail
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Scanning */}
        {currentStep === 3 && (
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 animate-pulse text-primary" />
              </div>
              <CardTitle className="text-3xl">Analyzing Your Subscriptions</CardTitle>
              <CardDescription className="text-lg">This will only take a moment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{scanStatus}</span>
                    <span className="text-muted-foreground">{scanProgress}%</span>
                  </div>
                  <Progress value={scanProgress} className="h-3" />
                </div>

                <div className="rounded-lg border bg-card/50 p-6">
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {scanProgress >= 20 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 animate-pulse rounded-full border-2 border-primary" />
                      )}
                      <span>Connecting to your inbox</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {scanProgress >= 40 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      <span>Scanning invoices and receipts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {scanProgress >= 60 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      <span>Calculating trust scores</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {scanProgress >= 80 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      <span>Detecting renewal dates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {scanProgress >= 100 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      <span>Finalizing your dashboard</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
