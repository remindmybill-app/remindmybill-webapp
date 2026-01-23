"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import type { Subscription } from "@/lib/types"

interface SubscriptionSelectorModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subscriptions: Subscription[]
    onConfirm: (selectedIds: string[]) => void
    isProcessing: boolean
}

export function SubscriptionSelectorModal({
    open,
    onOpenChange,
    subscriptions,
    onConfirm,
    isProcessing
}: SubscriptionSelectorModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const handleToggle = (id: string, checked: boolean) => {
        if (checked) {
            if (selectedIds.length < 3) {
                setSelectedIds([...selectedIds, id])
            }
        } else {
            setSelectedIds(selectedIds.filter((sid) => sid !== id))
        }
    }

    const remainingSlots = 3 - selectedIds.length
    const isValid = selectedIds.length === 3 || (subscriptions.length < 3 && selectedIds.length === subscriptions.length)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Select Subscriptions to Keep</DialogTitle>
                    <DialogDescription>
                        The Free plan allows up to 3 active subscriptions. Please select which ones you want to keep tracking.
                        The others will be marked as cancelled in your history.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {remainingSlots > 0 ? (
                            <>
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span>Select {remainingSlots} more to continue</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-green-600">Selection complete</span>
                            </>
                        )}
                    </div>
                    <Badge variant={remainingSlots === 0 ? "default" : "outline"}>
                        {selectedIds.length} / 3 Selected
                    </Badge>
                </div>

                <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="space-y-4">
                        {subscriptions.map((sub) => {
                            const isSelected = selectedIds.includes(sub.id)
                            const isDisabled = !isSelected && selectedIds.length >= 3

                            return (
                                <div
                                    key={sub.id}
                                    className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'bg-card'}`}
                                >
                                    <Checkbox
                                        id={sub.id}
                                        checked={isSelected}
                                        disabled={isDisabled}
                                        onCheckedChange={(checked) => handleToggle(sub.id, checked as boolean)}
                                    />
                                    <div className="grid gap-1.5 leading-none w-full">
                                        <label
                                            htmlFor={sub.id}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex justify-between items-center w-full"
                                        >
                                            <span>{sub.name}</span>
                                            <span className="font-bold">{sub.currency} {sub.cost}</span>
                                        </label>
                                        <p className="text-xs text-muted-foreground flex justify-between">
                                            <span>{sub.frequency}</span>
                                            {sub.renewal_date && <span>Renews: {new Date(sub.renewal_date).toLocaleDateString()}</span>}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onConfirm(selectedIds)}
                        disabled={!isValid || isProcessing}
                        variant="destructive"
                    >
                        {isProcessing ? "Processing..." : "Confirm & Downgrade"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
