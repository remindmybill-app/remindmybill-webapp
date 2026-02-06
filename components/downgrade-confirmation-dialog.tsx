"use client"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Lock } from "lucide-react"

interface DowngradeConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    onCancel: () => void
    subscriptionCount: number
    isProcessing?: boolean
}

export function DowngradeConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    onCancel,
    subscriptionCount,
    isProcessing = false,
}: DowngradeConfirmationDialogProps) {
    const isOverLimit = subscriptionCount > 3
    const lockedCount = subscriptionCount - 3

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Downgrade to Free?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            You will lose access to Pro features like unlimited tracking, AI Inbox Hunter, and priority support.
                        </p>
                        {isOverLimit && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                                <p className="font-semibold flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Subscriptions Will Be Locked
                                </p>
                                <p className="mt-1">
                                    Since you have <strong>{subscriptionCount}</strong> subscriptions, {" "}
                                    the <strong>{lockedCount}</strong> most recent ones will be <strong>Locked</strong> until you upgrade again or archive older ones.
                                </p>
                                <p className="mt-2 text-xs opacity-80">
                                    No data will be deleted. Locked subscriptions simply won't send reminders.
                                </p>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel} disabled={isProcessing}>
                        Keep Pro
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isProcessing}
                    >
                        {isProcessing ? "Processing..." : "Confirm Downgrade"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
