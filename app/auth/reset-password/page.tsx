"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bell, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

export default function ResetPasswordPage() {
    const router = useRouter()
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault()
        if (!newPassword) {
            toast.error("Please enter a new password")
            return
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }
        setIsSubmitting(true)
        try {
            const supabase = getSupabaseBrowserClient()
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            })
            if (error) {
                toast.error(error.message)
            } else {
                toast.success("Password updated successfully")
                router.push("/dashboard")
            }
        } catch {
            toast.error("Failed to update password")
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
                        <h1 className="text-3xl font-bold tracking-tight">Set new password</h1>
                        <p className="mt-2 text-muted-foreground">
                            Enter your new password below
                        </p>
                    </div>
                </div>

                {/* Reset Card */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="At least 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-new-password">Confirm new password</Label>
                            <Input
                                id="confirm-new-password"
                                type="password"
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                        <Button
                            id="update-password"
                            type="submit"
                            size="lg"
                            className="w-full h-12 gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Updating password...
                                </>
                            ) : (
                                <>
                                    <Lock className="h-4 w-4" />
                                    Update password
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Security Badge */}
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Bell className="h-4 w-4 text-green-500" />
                        <span>Your password is encrypted and stored securely</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
