'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Receipt, CheckCircle2, AlertCircle } from "lucide-react"
import { createClientComponentClient } from '@/lib/supabase/client'
import { toast } from "sonner"

interface DetectedSubscription {
    name: string
    cost: number
    currency: string
    frequency: string
    confidence: number
}

interface GmailImportModalProps {
    isOpen: boolean
    onClose: () => void
    foundSubscriptions: DetectedSubscription[]
    onImportComplete: () => void
}

export function GmailImportModal({ isOpen, onClose, foundSubscriptions, onImportComplete }: GmailImportModalProps) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>(
        foundSubscriptions.map((_, i) => i) // All selected by default
    )
    const [isImporting, setIsImporting] = useState(false)

    const handleToggle = (index: number) => {
        setSelectedIndices(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        )
    }

    const handleImport = async () => {
        if (selectedIndices.length === 0) {
            onClose()
            return
        }

        setIsImporting(true)
        const supabase = createClientComponentClient()

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No user found")

            const subsToImport = selectedIndices.map(i => foundSubscriptions[i])
            let importedCount = 0

            for (const sub of subsToImport) {
                // Double check for duplicates before final insert
                const { data: existing } = await supabase
                    .from('subscriptions')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('name', sub.name)
                    .single()

                if (!existing) {
                    await supabase.from('subscriptions').insert({
                        user_id: user.id,
                        name: sub.name,
                        cost: sub.cost,
                        currency: sub.currency,
                        frequency: sub.frequency,
                        status: 'active',
                        trust_score: 100,
                        category: 'Software',
                        renewal_date: new Date().toISOString()
                    })
                    importedCount++
                }
            }

            toast.success(`Imported ${importedCount} subscriptions`)
            onImportComplete()
            onClose()

        } catch (error: any) {
            console.error("Import failed:", error)
            toast.error("Import failed", { description: error.message })
        } finally {
            setIsImporting(false)
        }
    }

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md md:max-w-lg bg-zinc-950/90 backdrop-blur-xl border-zinc-800 text-zinc-50">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-500" />
                        Review Found Subscriptions
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        We found {foundSubscriptions.length} potential subscriptions in your emails. Select the ones you want to track.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
                    <div className="flex flex-col gap-3 py-4">
                        {foundSubscriptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500">
                                <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
                                <p>No subscriptions found in the scanned emails.</p>
                            </div>
                        ) : (
                            foundSubscriptions.map((sub, index) => (
                                <div
                                    key={index}
                                    className={`
                                        relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200
                                        ${selectedIndices.includes(index)
                                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'
                                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                            ${selectedIndices.includes(index) ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}
                                        `}>
                                            {sub.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-100">{sub.name}</h4>
                                            <p className="text-xs text-zinc-400 capitalize">
                                                {sub.frequency} • {sub.currency} <span className="text-emerald-400 font-mono font-bold">${sub.cost.toFixed(2)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <Checkbox
                                        id={`sub-${index}`}
                                        checked={selectedIndices.includes(index)}
                                        onCheckedChange={() => handleToggle(index)}
                                        className="h-5 w-5 border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="flex-col sm:justify-between gap-3 sm:gap-0">
                    <div className="text-xs text-zinc-500 flex items-center">
                        {selectedIndices.length} selected
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" onClick={onClose} disabled={isImporting} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || selectedIndices.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Confirm Import
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
