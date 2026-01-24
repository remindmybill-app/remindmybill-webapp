'use client'

import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt, CheckCircle2, AlertCircle, Calendar, CreditCard, ArrowRight, ShieldCheck, AlertTriangle, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import { addSubscription, updateSubscription } from '@/app/actions/subscriptions'
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
    status: 'new' | 'duplicate' | 'conflict' | 'auto_added'
    existing_id?: string
    existing_data?: {
        name: string
        cost: number
        currency: string
    }
}

interface GmailImportModalProps {
    isOpen: boolean
    onClose: () => void
    foundSubscriptions: DetectedSubscription[]
    onImportComplete: () => void
}

export function GmailImportModal({ isOpen, onClose, foundSubscriptions, onImportComplete }: GmailImportModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'update' | 'new' | 'skip'>>({})
    const [isImporting, setIsImporting] = useState(false)

    // Select "new" and "conflict" items by default
    useEffect(() => {
        if (isOpen && foundSubscriptions.length > 0) {
            const initialSelection = new Set(
                foundSubscriptions
                    .filter(s => s.status === 'new' || s.status === 'conflict')
                    .map(s => s.id)
            )
            setSelectedIds(initialSelection)

            // Default conflicts to 'update'
            const initialResolutions: Record<string, 'update' | 'new' | 'skip'> = {}
            foundSubscriptions.forEach(s => {
                if (s.status === 'conflict') {
                    initialResolutions[s.id] = 'update'
                }
            })
            setConflictResolutions(initialResolutions)
        }
    }, [isOpen, foundSubscriptions])

    const toggleSelection = (id: string, status: string) => {
        // Allow selection for duplicates if user wants to "Add Duplicate"
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedIds(next)
    }

    const handleImportAllNew = async () => {
        const onlyNew = foundSubscriptions.filter(s => s.status === 'new')
        await startImport(onlyNew)
    }

    const handleImport = async () => {
        const toProcess = foundSubscriptions.filter(s => selectedIds.has(s.id))
        const finalToProcess = toProcess.filter(s => {
            if (s.status === 'conflict' && conflictResolutions[s.id] === 'skip') return false
            return true
        })
        await startImport(finalToProcess)
    }

    const startImport = async (items: DetectedSubscription[]) => {
        if (items.length === 0) {
            onClose()
            return
        }

        setIsImporting(true)
        let successCount = 0

        try {
            for (const sub of items) {
                if (sub.status === 'conflict' && conflictResolutions[sub.id] === 'update' && sub.existing_id) {
                    // UPDATE EXISTING
                    const result = await updateSubscription(sub.existing_id, {
                        cost: sub.cost,
                        renewal_date: sub.date
                    })
                    if (result.success) successCount++
                } else {
                    // ADD AS NEW (for 'new', 'duplicate', or 'conflict' resolved as 'new')
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
            }

            toast.success(`Processed ${successCount} subscriptions`, {
                description: "Your dashboard has been refreshed.",
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
            <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-50 overflow-hidden p-0 gap-0 shadow-2xl">
                <DialogHeader className="p-6 border-b border-white/10 bg-zinc-900/50">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-inner">
                                <Receipt className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">Smart Import Review</DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    We found {foundSubscriptions.length} items. Review and resolve before importing.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-4 py-6">
                        {foundSubscriptions.map((sub) => (
                            <div
                                key={sub.id}
                                className={`
                                    group relative flex flex-col p-4 rounded-2xl border transition-all duration-300
                                    ${sub.status === 'duplicate' ? 'opacity-70 bg-zinc-900/40 border-zinc-800/50' :
                                        selectedIds.has(sub.id) ? 'bg-zinc-900/80 border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'bg-zinc-900/20 border-zinc-800'}
                                `}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="mt-1">
                                            <Checkbox
                                                checked={selectedIds.has(sub.id)}
                                                onCheckedChange={() => toggleSelection(sub.id, sub.status)}
                                                className="h-5 w-5 rounded-md border-zinc-700 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bold text-lg text-zinc-100 truncate max-w-[200px]">{sub.name}</h4>

                                                {/* Status Badges */}
                                                {sub.status === 'duplicate' && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-zinc-800/50 border-zinc-700 text-zinc-400 font-medium">
                                                        <ShieldCheck className="w-3 h-3 mr-1" /> Already Tracking
                                                    </Badge>
                                                )}
                                                {sub.status === 'new' && (
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-medium">
                                                        New Subscription
                                                    </Badge>
                                                )}
                                                {sub.status === 'conflict' && (
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/20 text-amber-500 font-medium">
                                                        <AlertTriangle className="w-3 h-3 mr-1" /> Price Changed
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-xs text-zinc-500 bg-black/30 p-2.5 rounded-xl border border-white/5 line-clamp-2 leading-relaxed">
                                                <span className="text-zinc-600 font-mono mr-1">SNIPPET:</span>
                                                "{sub.snippet}"
                                            </p>

                                            {/* Conflict Resolution Details */}
                                            {sub.status === 'conflict' && (
                                                <div className="mt-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2 text-zinc-400">
                                                            <span>Was:</span>
                                                            <span className="line-through">{formatCurrency(sub.existing_data!.cost, sub.existing_data!.currency)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-zinc-500 font-medium">Now:</span>
                                                            <span className="font-black text-amber-500 text-sm">{formatCurrency(sub.cost, sub.currency)}</span>
                                                        </div>
                                                    </div>

                                                    {selectedIds.has(sub.id) && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant={conflictResolutions[sub.id] === 'update' ? 'default' : 'outline'}
                                                                className={`h-8 text-[11px] flex-1 rounded-lg transition-all ${conflictResolutions[sub.id] === 'update' ? 'bg-amber-600 hover:bg-amber-700 border-none' : 'border-amber-500/20 text-amber-500/70 hover:bg-amber-500/10'}`}
                                                                onClick={(e) => { e.stopPropagation(); setConflictResolutions(prev => ({ ...prev, [sub.id]: 'update' })) }}
                                                            >
                                                                <RefreshCcw className="w-3 h-3 mr-1.5" /> Update Existing
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={conflictResolutions[sub.id] === 'new' ? 'default' : 'outline'}
                                                                className={`h-8 text-[11px] flex-1 rounded-lg transition-all ${conflictResolutions[sub.id] === 'new' ? 'bg-zinc-800 border-none' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                                                                onClick={(e) => { e.stopPropagation(); setConflictResolutions(prev => ({ ...prev, [sub.id]: 'new' })) }}
                                                            >
                                                                Add as New
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-[11px] px-3 rounded-lg border-zinc-700 text-zinc-500 hover:bg-zinc-900"
                                                                onClick={(e) => { e.stopPropagation(); toggleSelection(sub.id, sub.status) }}
                                                            >
                                                                Skip
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-xl font-black text-zinc-100 font-mono tracking-tighter">
                                            {formatCurrency(sub.cost, sub.currency)}
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(sub.date), 'MMM dd, yyyy')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-9 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl px-4"
                            onClick={handleImportAllNew}
                            disabled={isImporting}
                        >
                            Import All New
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                                {selectedIds.size} Selected
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isImporting}
                            className="text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || selectedIds.size === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 px-8 rounded-xl min-w-[160px] shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    Confirm Review
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
