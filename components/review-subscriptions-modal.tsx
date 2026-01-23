"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency } from "@/lib/utils/currency"

interface FoundSubscription {
    name: string
    cost: number
    currency: string
    frequency: string
    renewal_date?: string
    confidence?: number // Optional score from AI
}

interface ReviewSubscriptionsModalProps {
    isOpen: boolean
    onClose: () => void
    foundSubscriptions: FoundSubscription[]
    onImportComplete: () => void
}

export function ReviewSubscriptionsModal({ isOpen, onClose, foundSubscriptions, onImportComplete }: ReviewSubscriptionsModalProps) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>(foundSubscriptions.map((_, i) => i)) // Select all by default
    const [isImporting, setIsImporting] = useState(false)
    const { user } = useAuth()

    const toggleSelection = (index: number) => {
        setSelectedIndices(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        )
    }

    const handleImport = async () => {
        if (!user) return

        setIsImporting(true)
        const supabase = getSupabaseBrowserClient()

        const subscriptionsToImport = selectedIndices.map(i => {
            const sub = foundSubscriptions[i]
            return {
                user_id: user.id,
                name: sub.name,
                cost: sub.cost,
                currency: sub.currency || 'USD',
                frequency: sub.frequency?.toLowerCase() || 'monthly',
                category: 'Other', // Default category, user can edit later
                status: 'active',
                renewal_date: sub.renewal_date || new Date().toISOString(),
                trust_score: 80, // Default trust score
                auto_renewal: true
            }
        })

        try {
            const { error } = await supabase.from('subscriptions').insert(subscriptionsToImport)

            if (error) throw error

            toast.success(`Successfully imported ${subscriptionsToImport.length} subscriptions`)
            onImportComplete()
            onClose()
        } catch (error) {
            console.error("Import failed:", error)
            toast.error("Failed to save subscriptions. Please try again.")
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isImporting && !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Review Found Subscriptions</DialogTitle>
                    <DialogDescription>
                        We found {foundSubscriptions.length} potential subscriptions in your emails. Select the ones you want to track.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="space-y-4">
                        {foundSubscriptions.map((sub, index) => (
                            <div key={index} className="flex items-start space-x-3 rounded-lg border p-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <Checkbox
                                    id={`sub-${index}`}
                                    checked={selectedIndices.includes(index)}
                                    onCheckedChange={() => toggleSelection(index)}
                                    className="mt-1"
                                />
                                <div className="grid gap-1.5 leading-none w-full">
                                    <div className="flex items-center justify-between w-full">
                                        <Label
                                            htmlFor={`sub-${index}`}
                                            className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {sub.name}
                                        </Label>
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {formatCurrency(sub.cost, sub.currency || 'USD')}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {sub.frequency || 'Monthly'} • Detected via Gmail
                                    </p>
                                </div>
                            </div>
                        ))}
                        {foundSubscriptions.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                                <p>No new subscriptions found to review.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="flex-col sm:justify-between sm:flex-row gap-2">
                    <div className="text-xs text-muted-foreground self-center">
                        {selectedIndices.length} selected
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={isImporting}>
                            Cancel
                        </Button>
                        <Button onClick={handleImport} disabled={isImporting || selectedIndices.length === 0}>
                            {isImporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    Import Selected
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
