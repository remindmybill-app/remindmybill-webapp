"use client"

import { useState } from "react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bell, ArrowLeft, Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [emailSent, setEmailSent] = useState(false)

    async function handleResetRequest(e: React.FormEvent) {
        e.preventDefault()
        if (!email.trim()) {
            toast.error("Please enter your email address")
            return
        }
        setIsSubmitting(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            })
            if (error) {
                toast.error(error.message)
            } else {
                toast.success("Password reset link sent — check your email")
                setEmailSent(true)
            }
        } catch {
            toast.error("Failed to send reset link")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-6">
                {/* Logo & Branding */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-6 ring-1 ring-primary/20">
                        <Bell className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
                        <p className="mt-2 text-muted-foreground">
                            {emailSent
                                ? "Check your inbox for a password reset link"
                                : "Enter your email and we'll send you a reset link"}
                        </p>
                    </div>
                </div>

                {/* Reset Card */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    {emailSent ? (
                        <div className="space-y-4 text-center">
                            <div className="inline-flex items-center justify-center rounded-full bg-green-500/10 p-4">
                                <Mail className="h-8 w-8 text-green-500" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                                Click the link in the email to reset your password.
                            </p>
                            <Button
                                id="resend-reset-link"
                                variant="outline"
                                onClick={() => setEmailSent(false)}
                                className="w-full"
                            >
                                Didn&apos;t receive it? Send again
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleResetRequest} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email address</Label>
                                <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                            <Button
                                id="send-reset-link"
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
                                    "Send reset link"
                                )}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Back to login */}
                <div className="text-center">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
