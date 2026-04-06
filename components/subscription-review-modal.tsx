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

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isSaving, setIsSaving] = useState(false)
    const [errorText, setErrorText] = useState<string | null>(null)
    const [initialized, setInitialized] = useState(false)

    const showModal = profile?.needs_subscription_review === true && subscriptions.length > 5

    // Initialize modal state
    useEffect(() => {
        if (showModal && !initialized) {
            // Pre-select based on is_enabled
            const initialSelected = new Set<string>()
            subscriptions.forEach(sub => {
                if (sub.is_enabled) initialSelected.add(sub.id)
            })
            setSelectedIds(initialSelected)
            setInitialized(true)
        } else if (!showModal && initialized) {
            setInitialized(false)
        }
    }, [showModal, initialized, subscriptions])

    // If shouldn't show, render nothing
    if (!showModal) return null

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
        if (selectedCount > 5) {
            setErrorText("Deselect one to add another")
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

            // The modal will close automatically because profile.needs_subscription_review is now false
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
        <Dialog open={showModal} onOpenChange={() => { }}>
            {/* 
        onOpenChange is a no-op so clicking outside or pressing ESC doesn't close it 
        and no DialogClose button is provided
      */}
            <DialogContent className="sm:max-w-[500px] gap-6 [&>button]:hidden bg-background border-border text-foreground p-6 sm:p-8 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl">
                <DialogHeader className="gap-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <ShieldAlert className="h-8 w-8 text-orange-600 dark:text-orange-500" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold tracking-tight text-foreground">Your plan has changed</DialogTitle>
                    <DialogDescription className="text-center text-sm text-muted-foreground">
                        You've been moved to the <strong className="font-bold text-foreground">Free plan</strong>.
                        You can keep up to 5 active subscriptions. Please select which ones to keep &mdash;
                        the rest will remain saved but paused.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Select up to 5</span>
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {selectedCount} / 5 selected
                        </span>
                    </div>

                    <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar [&::-webkit-scrollbar-track]:bg-gray-200 dark:[&::-webkit-scrollbar-track]:bg-gray-800">
                        {subscriptions.map((sub) => {
                            const checked = selectedIds.has(sub.id)
                            return (
                                <div
                                    key={sub.id}
                                    className={`flex items-center justify-between rounded-xl p-3 transition-all cursor-pointer border ${checked
                                        ? "bg-emerald-50 border-emerald-200 text-foreground dark:bg-emerald-900/30 dark:border-emerald-700"
                                        : "bg-background hover:bg-muted/50 text-foreground border-transparent"
                                        }`}
                                    onClick={() => handleToggle(sub.id, !checked)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(c) => handleToggle(sub.id, c as boolean)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={checked ? "border-primary" : ""}
                                        />
                                        <div>
                                            <p className="font-bold text-sm">{sub.name}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${checked ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{sub.category}</p>
                                        </div>
                                    </div>
                                    <div className={`text-right font-bold text-sm ${checked ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
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
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-base rounded-xl shadow-lg shadow-emerald-500/20"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Save My Selection
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full h-11 text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest hover:bg-muted/50 rounded-xl"
                        onClick={handleUpgrade}
                        disabled={isSaving}
                    >
                        Upgrade to Pro
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
