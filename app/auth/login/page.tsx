"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Bell, Mail } from "lucide-react"

export default function LoginPage() {
    const { signIn, isLoading, isAuthenticated } = useAuth()
    const router = useRouter()

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            router.push("/dashboard")
        }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 text-center">
                {/* Logo & Branding */}
                <div className="flex flex-col items-center gap-4">
                    <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-6 ring-1 ring-primary/20">
                        <Bell className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Welcome to Remind My Bill</h1>
                        <p className="mt-2 text-muted-foreground">
                            Sign in with Google to start tracking your subscriptions
                        </p>
                    </div>
                </div>

                {/* Sign In Button */}
                <div className="space-y-4">
                    <Button
                        onClick={signIn}
                        disabled={isLoading}
                        size="lg"
                        className="w-full gap-2 h-12"
                    >
                        <Mail className="h-5 w-5" />
                        {isLoading ? "Redirecting to Google..." : "Sign in with Google"}
                    </Button>

                    {/* Privacy Notice */}
                    <p className="text-xs text-muted-foreground">
                        By signing in, you agree to our Terms of Service and Privacy Policy.
                        We use read-only access to scan your Gmail for subscription receipts.
                    </p>
                </div>

                {/* Security Badge */}
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Bell className="h-4 w-4 text-green-500" />
                        <span>Secured with Google OAuth 2.0</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
