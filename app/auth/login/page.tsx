"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/use-auth"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bell, Mail, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' }
  if (score <= 3) return { score, label: 'Good', color: '#eab308' }
  return { score, label: 'Strong', color: '#22c55e' }
}

// --- Friendly auth error handler ---
function handleAuthError(error: any, email: string) {
    const msg = error?.message?.toLowerCase() || ""

    if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("provider") ||
        error?.code === "user_already_exists"
    ) {
        toast.error(
            "This email is linked to a different sign-in method. Try signing in with Google instead.",
            { duration: 5000 }
        )
        return
    }

    if (
        msg.includes("invalid login credentials") ||
        msg.includes("invalid credentials")
    ) {
        toast.error("Incorrect email or password.")
        return
    }

    if (msg.includes("email not confirmed")) {
        toast.error("Please confirm your email first — check your inbox.")
        return
    }

    if (msg.includes("rate limit") || msg.includes("too many")) {
        toast.error("Too many attempts. Please wait a few minutes and try again.")
        return
    }

    toast.error(error?.message || "Something went wrong. Please try again.")
}

export default function LoginPage() {
    const { signIn, isLoading: authLoading, isAuthenticated } = useAuth()
    const router = useRouter()

    // Form state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSignUp, setIsSignUp] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState("magic-link")

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            router.push("/dashboard")
        }
    }, [isAuthenticated, authLoading, router])

    // --- Auth Handlers ---

    async function handleMagicLink(e: React.FormEvent) {
        e.preventDefault()
        if (!email.trim()) {
            toast.error("Please enter your email address")
            return
        }
        setIsSubmitting(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) {
                handleAuthError(error, email)
            } else {
                toast.success("Magic link sent — check your email")
            }
        } catch {
            toast.error("Failed to send magic link")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleEmailSignIn(e: React.FormEvent) {
        e.preventDefault()
        if (!email.trim() || !password) {
            toast.error("Please enter your email and password")
            return
        }
        setIsSubmitting(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) handleAuthError(error, email)
        } catch {
            toast.error("Failed to sign in")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleEmailSignUp(e: React.FormEvent) {
        e.preventDefault()
        if (!email.trim() || !password) {
            toast.error("Please enter your email and password")
            return
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }
        setIsSubmitting(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) {
                handleAuthError(error, email)
            } else {
                toast.success("Account created — check your email to confirm")
            }
        } catch {
            toast.error("Failed to create account")
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Loading State ---
    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
                </div>
            </div>
        )
    }

    const strength = getPasswordStrength(password)

    // --- Render ---
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-6">
                {/* Logo & Branding */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-6 ring-1 ring-primary/20">
                        <Bell className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isSignUp ? "Create your account" : "Welcome to Remind My Bill"}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {isSignUp
                                ? "Sign up to start tracking your subscriptions"
                                : "Sign in to manage your subscriptions"}
                        </p>
                    </div>
                </div>

                {/* Auth Card */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                    {/* Google Sign In — always visible in both modes */}
                    <Button
                        id="google-sign-in"
                        onClick={signIn}
                        disabled={authLoading}
                        size="lg"
                        className="w-full gap-2 h-12"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                                fill="#EA4335"
                            />
                        </svg>
                        {authLoading
                            ? "Redirecting to Google..."
                            : isSignUp
                              ? "Sign up with Google"
                              : "Sign in with Google"}
                    </Button>

                    {/* Divider — always visible */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                or continue with email
                            </span>
                        </div>
                    </div>

                    {/* Sign Up Form */}
                    {isSignUp ? (
                        <form onSubmit={handleEmailSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signup-email">Email</Label>
                                <Input
                                    id="signup-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">Password</Label>
                                <Input
                                    id="signup-password"
                                    type="password"
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                                {password.length > 0 && (
                                    <div className="space-y-1.5 mt-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div
                                                    key={i}
                                                    className="h-1 flex-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        background: i <= Math.ceil(strength.score / 1.25)
                                                            ? strength.color
                                                            : '#262626'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs" style={{ color: strength.color }}>
                                            {strength.label} password
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                                <Input
                                    id="signup-confirm-password"
                                    type="password"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                                {confirmPassword.length > 0 && (
                                    <p className={`text-xs flex items-center gap-1.5 mt-1 ${
                                        password === confirmPassword ? 'text-green-500' : 'text-red-400'
                                    }`}>
                                        {password === confirmPassword ? (
                                            <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Passwords match</>
                                        ) : (
                                            <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Passwords don't match</>
                                        )}
                                    </p>
                                )}
                            </div>
                            <Button
                                id="create-account"
                                type="submit"
                                size="lg"
                                className="w-full h-12 gap-2"
                                disabled={isSubmitting || password !== confirmPassword || password.length < 6}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        Create account
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        /* Sign In Tabs: Magic Link | Password */
                        <div className="w-full space-y-4">
                            <div className="flex rounded-lg border border-[#2a2a2a] p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('magic-link')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                        activeTab === 'magic-link'
                                            ? 'bg-[#22c55e] text-black shadow-sm'
                                            : 'text-[#666] hover:text-[#aaa] hover:bg-[#1a1a1a]'
                                    }`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                    Magic Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('password')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                        activeTab === 'password'
                                            ? 'bg-[#22c55e] text-black shadow-sm'
                                            : 'text-[#666] hover:text-[#aaa] hover:bg-[#1a1a1a]'
                                    }`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    Password
                                </button>
                            </div>

                            {/* Magic Link Content */}
                            {activeTab === 'magic-link' && (
                                <form onSubmit={handleMagicLink} className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="magic-link-email">Email</Label>
                                        <Input
                                            id="magic-link-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                    <Button
                                        id="send-magic-link"
                                        type="submit"
                                        size="lg"
                                        className="w-full h-12 gap-2"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Sending link...
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="h-4 w-4" />
                                                Send magic link
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}

                            {/* Password Content */}
                            {activeTab === 'password' && (
                                <form onSubmit={handleEmailSignIn} className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="password-email">Email</Label>
                                        <Input
                                            id="password-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password-input">Password</Label>
                                        <Input
                                            id="password-input"
                                            type="password"
                                            placeholder="Your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                        />
                                    </div>
                                    <Button
                                        id="sign-in-password"
                                        type="submit"
                                        size="lg"
                                        className="w-full h-12 gap-2"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            <>
                                                Sign in
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                    <div className="text-center">
                                        <Link
                                            href="/forgot-password"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                {/* Toggle Sign In / Sign Up */}
                <div className="text-center text-sm text-muted-foreground">
                    {isSignUp ? (
                        <>
                            Already have an account?{" "}
                            <button
                                id="toggle-to-signin"
                                type="button"
                                onClick={() => {
                                    setIsSignUp(false)
                                    setPassword("")
                                    setConfirmPassword("")
                                }}
                                className="font-medium text-primary hover:underline"
                            >
                                Sign in
                            </button>
                        </>
                    ) : (
                        <>
                            Don&apos;t have an account?{" "}
                            <button
                                id="toggle-to-signup"
                                type="button"
                                onClick={() => {
                                    setIsSignUp(true)
                                    setPassword("")
                                    setConfirmPassword("")
                                }}
                                className="font-medium text-primary hover:underline"
                            >
                                Sign up
                            </button>
                        </>
                    )}
                </div>

                {/* Privacy Notice */}
                <p className="text-center text-xs text-muted-foreground">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>

                {/* Security Badge */}
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Bell className="h-4 w-4 text-green-500" />
                        <span>Secured with industry-standard authentication</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
