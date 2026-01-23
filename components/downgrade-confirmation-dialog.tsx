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

interface DowngradeConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    onCancel: () => void
    subscriptionCount: number
}

export function DowngradeConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    onCancel,
    subscriptionCount,
}: DowngradeConfirmationDialogProps) {
    const isOverLimit = subscriptionCount > 3

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Downgrade to Free Plan?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            Are you sure you want to cancel your Pro subscription? You will lose access to unlimited tracking,
                            advanced analytics, and priority support.
                        </p>
                        {isOverLimit && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                                <p className="font-semibold">⚠️ Action Required</p>
                                <p>
                                    You currently have <strong>{subscriptionCount}</strong> active subscriptions.
                                    The Free plan limit is <strong>3</strong>.
                                </p>
                                <p className="mt-1">
                                    You will need to select which 3 subscriptions to keep in the next step.
                                    The rest will be cancelled.
                                </p>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>Keep Pro</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isOverLimit ? "Continue & Select Subscriptions" : "Confirm Downgrade"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
