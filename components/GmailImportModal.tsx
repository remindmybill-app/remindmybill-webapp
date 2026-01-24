'use client'

import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt, CheckCircle2, AlertCircle, Calendar, CreditCard, ArrowRight, ShieldCheck, AlertTriangle, RefreshCcw, ChevronDown, Mail } from "lucide-react"
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
    subject?: string
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
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'update' | 'new' | 'skip'>>({})
    const [isImporting, setIsImporting] = useState(false)

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedIds(next)
    }

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
                                    We found {foundSubscriptions.length} detections. Click chevron to see email source.
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
                                    group relative flex flex-col p-5 rounded-3xl border transition-all duration-300
                                    ${sub.status === 'duplicate' ? 'opacity-70 bg-zinc-900/20 border-white/5' :
                                        selectedIds.has(sub.id) ? 'bg-zinc-900 ring-1 ring-indigo-500/50 border-transparent shadow-2xl shadow-indigo-500/10' : 'bg-zinc-900/40 border-white/5'}
                                `}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="shrink-0">
                                            <Checkbox
                                                id={`cb-${sub.id}`}
                                                checked={selectedIds.has(sub.id)}
                                                onCheckedChange={() => toggleSelection(sub.id, sub.status)}
                                                className="h-6 w-6 rounded-lg border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-lg transition-transform active:scale-90"
                                            />
                                        </div>

                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl bg-white shadow-xl ring-1 ring-white/10 overflow-hidden">
                                                <img
                                                    src={`https://logo.clearbit.com/${sub.name.toLowerCase().replace(/\s+/g, '')}.com`}
                                                    alt={sub.name}
                                                    className="h-full w-full object-contain p-2"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.parentElement!.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-zinc-800 text-zinc-400 font-black text-xl">${sub.name[0]}</div>`;
                                                    }}
                                                />
                                            </div>

                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <label htmlFor={`cb-${sub.id}`} className="font-heavy text-lg text-white truncate cursor-pointer select-none">
                                                        {sub.name}
                                                    </label>
                                                    {sub.status === 'new' && (
                                                        <Badge className="bg-indigo-500/10 text-indigo-400 border-none px-2 py-0 text-[10px] uppercase font-black tracking-widest h-5">
                                                            New
                                                        </Badge>
                                                    )}
                                                    {sub.status === 'duplicate' && (
                                                        <Badge variant="outline" className="text-zinc-500 border-zinc-800 px-2 py-0 text-[10px] uppercase font-black tracking-widest h-5">
                                                            Tracked
                                                        </Badge>
                                                    )}
                                                    {sub.status === 'conflict' && (
                                                        <Badge className="bg-amber-500 text-amber-950 border-none px-2 py-0 text-[10px] uppercase font-black tracking-widest h-5 ring-4 ring-amber-500/20">
                                                            Action Required
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(sub.date), 'MMM dd, yyyy')}
                                                    </div>
                                                    <button
                                                        onClick={() => toggleExpand(sub.id)}
                                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                                    >
                                                        <Mail className="h-3 w-3" />
                                                        Email Source
                                                        <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${expandedIds.has(sub.id) ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 pl-4 border-l border-white/5">
                                        <div className="text-2xl font-black text-white tracking-tighter">
                                            {formatCurrency(sub.cost, sub.currency)}
                                        </div>
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">
                                            {sub.frequency || 'Monthly'} Bill
                                        </div>
                                    </div>
                                </div>

                                {/* Email Context Preview */}
                                {expandedIds.has(sub.id) && (
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="rounded-2xl bg-black/40 border border-white/5 p-4 space-y-3">
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Subject</p>
                                                <p className="text-xs font-bold text-zinc-200 line-clamp-1 italic">"{sub.subject || 'No Subject'}"</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Snippet</p>
                                                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                                                    {sub.snippet}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Conflict Resolution Section */}
                                {sub.status === 'conflict' && selectedIds.has(sub.id) && (
                                    <div className="mt-5 p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest text-amber-500">Price Conflict Detected</p>
                                                    <p className="text-[11px] text-zinc-400">Previous: {formatCurrency(sub.existing_data!.cost, sub.existing_data!.currency)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-white">{formatCurrency(sub.cost, sub.currency)}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold">New Detected Price</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                size="sm"
                                                variant={conflictResolutions[sub.id] === 'update' ? 'default' : 'outline'}
                                                className={`h-10 text-xs font-black uppercase tracking-widest flex-1 rounded-2xl transition-all ${conflictResolutions[sub.id] === 'update' ? 'bg-amber-500 hover:bg-amber-600 border-none text-amber-950' : 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'}`}
                                                onClick={(e) => { e.stopPropagation(); setConflictResolutions(prev => ({ ...prev, [sub.id]: 'update' })) }}
                                            >
                                                <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Update Portfolio
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={conflictResolutions[sub.id] === 'new' ? 'default' : 'outline'}
                                                className={`h-10 text-xs font-black uppercase tracking-widest flex-1 rounded-2xl transition-all ${conflictResolutions[sub.id] === 'new' ? 'bg-white text-black hover:bg-zinc-200 border-none' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                                                onClick={(e) => { e.stopPropagation(); setConflictResolutions(prev => ({ ...prev, [sub.id]: 'new' })) }}
                                            >
                                                Add Separate
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-10 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white"
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(sub.id, sub.status) }}
                                            >
                                                Ignore
                                            </Button>
                                        </div>
                                    </div>
                                )}
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
