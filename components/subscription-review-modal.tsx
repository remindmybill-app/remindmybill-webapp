"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { useProfile } from "@/lib/hooks/use-profile"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/currency"
import { Loader2, ShieldAlert } from "lucide-react"

export function SubscriptionReviewModal() {
    const { profile, refreshProfile } = useProfile()
    const { subscriptions, refreshSubscriptions } = useSubscriptions()
    const router = useRouter()
    const supabase = getSupabaseBrowserClient()

    const [isOpen, setIsOpen] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isSaving, setIsSaving] = useState(false)
    const [errorText, setErrorText] = useState<string | null>(null)

    // Initialize modal state
    useEffect(() => {
        if (profile?.needs_subscription_review === true && subscriptions.length > 5) {
            setIsOpen(true)
            // Pre-select based on is_enabled
            const initialSelected = new Set<string>()
            subscriptions.forEach(sub => {
                if (sub.is_enabled) initialSelected.add(sub.id)
            })
            setSelectedIds(initialSelected)
        } else {
            setIsOpen(false)
        }
    }, [profile?.needs_subscription_review, subscriptions])

    // If closed or shouldn't show, render nothing
    if (!isOpen) return null

    const selectedCount = selectedIds.size

    const handleToggle = (id: string, checked: boolean) => {
        setErrorText(null)
        const newSet = new Set(selectedIds)

        if (checked) {
            if (newSet.size >= 5) {
                setErrorText("Deselect one to add another")
                return
            }
            newSet.add(id)
        } else {
            newSet.delete(id)
        }

        setSelectedIds(newSet)
    }

    const handleSave = async () => {
        if (selectedCount < 1) {
            setErrorText("You must select at least 1 subscription to keep")
            return
        }

        setIsSaving(true)
        setErrorText(null)

        try {
            // Create bulk updates
            const promises = subscriptions.map((sub) => {
                const isSelected = selectedIds.has(sub.id)
                if (sub.is_enabled !== isSelected) {
                    return supabase
                        .from("subscriptions")
                        .update({ is_enabled: isSelected })
                        .eq("id", sub.id)
                }
                return Promise.resolve()
            })

            // Update profile
            const profilePromise = supabase
                .from("profiles")
                .update({ needs_subscription_review: false })
                .eq("id", profile!.id)

            await Promise.all([...promises, profilePromise])

            toast.success("Selections saved successfully", {
                description: "Your unselected subscriptions have been paused."
            })

            setIsOpen(false)
            await Promise.all([refreshProfile(), refreshSubscriptions()])

        } catch (err) {
            console.error("Failed to save review selections:", err)
            setErrorText("Failed to save changes. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpgrade = () => {
        // If they upgrade, it redirects them away
        router.push("/pricing")
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            {/* 
        onOpenChange is a no-op so clicking outside or pressing ESC doesn't close it 
        and no DialogClose button is provided
      */}
            <DialogContent className="sm:max-w-[500px] gap-6 [&>button]:hidden">
                <DialogHeader className="gap-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <ShieldAlert className="h-8 w-8 text-orange-600 dark:text-orange-500" />
                    </div>
                    <DialogTitle className="text-center text-2xl">Your plan has changed</DialogTitle>
                    <DialogDescription className="text-center text-base">
                        You've been moved to the <strong className="text-foreground">Guardian plan</strong>.
                        You can keep up to 5 active subscriptions. Please select which ones to keep &mdash;
                        the rest will remain saved but paused.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
                    <div className="mb-3 flex items-center justify-between font-bold">
                        <span>Select up to 5</span>
                        <span className={selectedCount === 5 ? "text-primary" : ""}>
                            {selectedCount} / 5 selected
                        </span>
                    </div>

                    <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
                        {subscriptions.map((sub) => {
                            const checked = selectedIds.has(sub.id)
                            return (
                                <div
                                    key={sub.id}
                                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${checked
                                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                                            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                                        }`}
                                    onClick={() => handleToggle(sub.id, !checked)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(c) => handleToggle(sub.id, c as boolean)}
                                            // prevent event bubbling if checkbox directly clicked
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div>
                                            <p className="font-semibold text-sm leading-none">{sub.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{sub.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right font-medium text-sm">
                                        {formatCurrency(sub.cost, sub.currency)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {errorText && (
                        <p className="mt-3 text-center text-sm font-semibold text-destructive animate-in fade-in slide-in-from-bottom-2">
                            {errorText}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Save My Selection
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full h-12 text-muted-foreground hover:text-foreground"
                        onClick={handleUpgrade}
                        disabled={isSaving}
                    >
                        Upgrade to Shield
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
