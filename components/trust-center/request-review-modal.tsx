"use client"

import { useState, useEffect } from "react"
import { Loader2, HelpCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { requestReview } from "@/app/actions/service-request"

interface RequestReviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultServiceName?: string
}

export function RequestReviewModal({
    open,
    onOpenChange,
    defaultServiceName = "",
}: RequestReviewModalProps) {
    const [serviceName, setServiceName] = useState(defaultServiceName)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Update service name when defaultServiceName changes or modal opens
    useEffect(() => {
        if (open) {
            setServiceName(defaultServiceName)
            setError(null)
        }
    }, [open, defaultServiceName])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!serviceName) return

        setIsSubmitting(true)
        setError(null)

        try {
            const result = await requestReview(serviceName)

            if (result.success) {
                toast.success("Request Submitted!", {
                    description: `We will review ${serviceName} and add it to our database.`,
                })
                onOpenChange(false)
                setServiceName("")
            } else {
                setError(result.error || "Could not submit your request.")
            }
        } catch (err) {
            console.error("Request submission error:", err)
            setError("An unexpected error occurred. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Request a Service</DialogTitle>
                    <DialogDescription>
                        Don't see a service? Let us know and we'll audit it for dark patterns.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label
                            htmlFor="service-name"
                            className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1"
                        >
                            Service Name
                        </label>
                        <Input
                            id="service-name"
                            placeholder="e.g. Paramount+, New York Times"
                            value={serviceName}
                            onChange={(e) => {
                                setServiceName(e.target.value)
                                if (error) setError(null)
                            }}
                            className={`h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 ${error ? "border-rose-500 focus-visible:ring-rose-500" : ""
                                }`}
                            required
                            autoFocus
                        />
                        {error && (
                            <div className="flex items-center gap-2 mt-2 px-1 text-rose-500 text-sm animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="h-4 w-4" />
                                <p className="font-medium">{error}</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="pt-4">
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xl transition-all active:scale-[0.98]"
                            disabled={isSubmitting || !serviceName.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Submit Request"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
