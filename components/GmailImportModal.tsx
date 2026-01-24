'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt, CheckCircle2, AlertCircle, Calendar, CreditCard, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { addSubscription } from '@/app/actions/subscriptions'
import { format } from 'date-fns'

interface DetectedSubscription {
    id: string
    name: string
    cost: number
    currency: string
    frequency: string
    date: string
    snippet: string
    confidence: number
}

interface GmailImportModalProps {
    isOpen: boolean
    onClose: () => void
    foundSubscriptions: DetectedSubscription[]
    onImportComplete: () => void
}

export function GmailImportModal({ isOpen, onClose, foundSubscriptions, onImportComplete }: GmailImportModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isImporting, setIsImporting] = useState(false)

    // Select all high-confidence by default when modal opens
    useMemo(() => {
        if (isOpen && foundSubscriptions.length > 0 && selectedIds.size === 0) {
            const initialSelection = new Set(foundSubscriptions.map(s => s.id))
            setSelectedIds(initialSelection)
        }
    }, [isOpen, foundSubscriptions])

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedIds(next)
    }

    const handleImport = async () => {
        const toImport = foundSubscriptions.filter(s => selectedIds.has(s.id))
        if (toImport.length === 0) {
            onClose()
            return
        }

        setIsImporting(true)
        let successCount = 0

        try {
            for (const sub of toImport) {
                const result = await addSubscription({
                    name: sub.name,
                    cost: sub.cost,
                    currency: sub.currency,
                    frequency: sub.frequency,
                    renewal_date: sub.date,
                    category: 'Software'
                })
                if (result.success) successCount++
            }

            toast.success(`Successfully imported ${successCount} subscriptions`, {
                description: "Your dashboard has been updated.",
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            })

            onImportComplete()
            onClose()
        } catch (error: any) {
            console.error("Import failed:", error)
            toast.error("Import failed", { description: error.message })
        } finally {
            setIsImporting(false)
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(amount)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isImporting && !open && onClose()}>
            <DialogContent className="sm:max-w-2xl bg-zinc-950/95 backdrop-blur-2xl border-zinc-800 text-zinc-50 overflow-hidden p-0 gap-0 shadow-2xl">
                {/* Decorative Background */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-500/5 via-emerald-500/5 to-purple-500/5 pointer-events-none" />

                <div className="relative z-10">
                    <DialogHeader className="p-6 border-b border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                <Receipt className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">Review Subscriptions</DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    We found {foundSubscriptions.length} potential subscriptions in your Gmail.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] px-6 py-4">
                        <div className="space-y-4 py-2">
                            {foundSubscriptions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                                        <AlertCircle className="w-8 h-8 text-zinc-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-zinc-300">No subscriptions found</h3>
                                    <p className="text-zinc-500 max-w-[280px] mt-1 text-sm">
                                        We couldn't detect any subscription receipts in your recent emails.
                                    </p>
                                </div>
                            ) : (
                                foundSubscriptions.map((sub) => (
                                    <div
                                        key={sub.id}
                                        onClick={() => toggleSelection(sub.id)}
                                        className={`
                                            group relative flex flex-col p-4 rounded-2xl border transition-all duration-300 cursor-pointer
                                            ${selectedIds.has(sub.id)
                                                ? 'bg-emerald-500/5 border-emerald-500/40 shadow-[0_0_20px_-5px_rgba(16,185,129,0.1)]'
                                                : 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60 hover:border-zinc-700'}
                                        `}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="mt-1">
                                                    <Checkbox
                                                        checked={selectedIds.has(sub.id)}
                                                        className="h-5 w-5 rounded-md border-zinc-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-lg text-zinc-100 group-hover:text-white transition-colors">
                                                            {sub.name}
                                                        </h4>
                                                        {sub.confidence > 95 && (
                                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider py-0 px-1.5">
                                                                High Accuracy
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                                                        <span className="flex items-center gap-1.5 font-medium">
                                                            <Calendar className="w-3.5 h-3.5 opacity-60" />
                                                            {format(new Date(sub.date), 'MMMM dd, yyyy')}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 font-medium capitalize">
                                                            <CreditCard className="w-3.5 h-3.5 opacity-60" />
                                                            {sub.frequency}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-zinc-500 line-clamp-1 italic bg-black/20 p-2 rounded-lg border border-white/5 mt-2">
                                                        "{sub.snippet}"
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                                                    {formatCurrency(sub.cost, sub.currency)}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">
                                                    {sub.currency}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 border-t border-white/10 flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                {selectedIds.size} Selected for Import
                            </span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                disabled={isImporting}
                                className="text-zinc-500 hover:text-white hover:bg-white/5 font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={isImporting || selectedIds.size === 0}
                                size="lg"
                                className="relative overflow-hidden group bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-8 rounded-xl transition-all shadow-lg shadow-emerald-600/20 min-w-[180px]"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <span className="relative z-10 flex items-center gap-2">
                                            Import Selected
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
