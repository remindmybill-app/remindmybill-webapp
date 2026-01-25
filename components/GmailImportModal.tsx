'use client'

import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Loader2,
    Receipt,
    CheckCircle2,
    AlertCircle,
    Calendar,
    CreditCard,
    ArrowRight,
    ShieldCheck,
    AlertTriangle,
    RefreshCcw,
    ChevronDown,
    Mail,
    Pencil,
    X,
    Check,
    Clock,
    Filter
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { addSubscription, updateSubscription } from '@/app/actions/subscriptions'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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
    status: 'NEW' | 'EXISTS' | 'UPDATE'
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
    onRescan: (days: number) => void
    isScanning: boolean
}

export function GmailImportModal({
    isOpen,
    onClose,
    foundSubscriptions,
    onImportComplete,
    onRescan,
    isScanning
}: GmailImportModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [localEdits, setLocalEdits] = useState<Record<string, Partial<DetectedSubscription>>>({})
    const [timeRange, setTimeRange] = useState(90)
    const [isImporting, setIsImporting] = useState(false)

    // Select "NEW" and "UPDATE" items by default
    useEffect(() => {
        if (isOpen && foundSubscriptions.length > 0) {
            const initialSelection = new Set(
                foundSubscriptions
                    .filter(s => s.status === 'NEW' || s.status === 'UPDATE')
                    .map(s => s.id)
            )
            setSelectedIds(initialSelection)
            setLocalEdits({})
            setRemovedIds(new Set())
            setEditingId(null)
        }
    }, [isOpen, foundSubscriptions])

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedIds(next)
    }

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedIds(next)
    }

    const removeRow = (id: string) => {
        const next = new Set(removedIds)
        next.add(id)
        setRemovedIds(next)

        // Also deselect if it was selected
        if (selectedIds.has(id)) {
            const nextSel = new Set(selectedIds)
            nextSel.delete(id)
            setSelectedIds(nextSel)
        }
    }

    const handleEditChange = (id: string, field: keyof DetectedSubscription, value: any) => {
        setLocalEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }))
    }

    const getName = (sub: DetectedSubscription): string => {
        return (localEdits[sub.id]?.name ?? sub.name) as string
    }

    const getCost = (sub: DetectedSubscription): number => {
        return (localEdits[sub.id]?.cost ?? sub.cost) as number
    }

    const getDate = (sub: DetectedSubscription): string => {
        return (localEdits[sub.id]?.date ?? sub.date) as string
    }

    const getCurrency = (sub: DetectedSubscription): string => {
        return (localEdits[sub.id]?.currency ?? sub.currency) as string
    }

    const getFrequency = (sub: DetectedSubscription): string => {
        return (localEdits[sub.id]?.frequency ?? sub.frequency) as string
    }

    const handleImportAllNew = async () => {
        const onlyNew = foundSubscriptions.filter(s => s.status === 'NEW' && !removedIds.has(s.id))
        await startImport(onlyNew)
    }

    const handleImport = async () => {
        const toProcess = foundSubscriptions.filter(s => selectedIds.has(s.id) && !removedIds.has(s.id))
        await startImport(toProcess)
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
                const finalSub = {
                    ...sub,
                    ...localEdits[sub.id]
                }

                if ((sub.status === 'UPDATE' || sub.status === 'EXISTS') && sub.existing_id) {
                    const result = await updateSubscription(sub.existing_id, {
                        name: finalSub.name,
                        cost: finalSub.cost,
                        renewal_date: finalSub.date
                    })
                    if (result.success) successCount++
                } else {
                    const result = await addSubscription({
                        name: finalSub.name,
                        cost: finalSub.cost,
                        currency: finalSub.currency,
                        frequency: finalSub.frequency,
                        renewal_date: finalSub.date,
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

    const visibleSubscriptions = useMemo(() => {
        return foundSubscriptions.filter(s => !removedIds.has(s.id))
    }, [foundSubscriptions, removedIds])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isImporting && !isScanning && !open && onClose()}>
            <DialogContent className="sm:max-w-4xl bg-zinc-950/90 backdrop-blur-3xl border-white/10 text-zinc-50 overflow-hidden p-0 gap-0 shadow-2xl">
                <DialogHeader className="p-6 border-b border-white/5 bg-white/5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                                <Receipt className="w-7 h-7 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">Subscription Import Manager</DialogTitle>
                                <DialogDescription className="text-zinc-500 font-medium">
                                    Review and import detected bills from your inbox.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white rounded-xl h-10 px-4 gap-2">
                                        <Clock className="w-4 h-4" />
                                        Last {timeRange} Days
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                    {[30, 60, 90].map((days) => (
                                        <DropdownMenuItem
                                            key={days}
                                            onClick={() => {
                                                setTimeRange(days)
                                                onRescan(days)
                                            }}
                                            className="text-zinc-400 focus:text-white"
                                        >
                                            Last {days} Days
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] px-8">
                    <div className="space-y-4 py-8">
                        {isScanning ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
                                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-heavy text-xl">Scanning your inbox...</p>
                                    <p className="text-zinc-500 text-sm mt-1">Analyzing emails for subscription patterns</p>
                                </div>
                            </div>
                        ) : visibleSubscriptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-6">
                                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5 shadow-inner">
                                    <ShieldCheck className="w-10 h-10 text-zinc-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-heavy text-xl">No new bills found</p>
                                    <p className="text-zinc-500 text-sm mt-1">We couldn't find any recent subscription receipts.</p>
                                </div>
                            </div>
                        ) : (
                            visibleSubscriptions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className={cn(
                                        "group relative flex flex-col p-6 rounded-[2.5rem] border transition-all duration-500",
                                        sub.status === 'EXISTS' ? 'bg-zinc-950/40 border-white/5' :
                                            selectedIds.has(sub.id) ? 'bg-zinc-900/90 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.08)] ring-1 ring-indigo-500/30' :
                                                'bg-zinc-900/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-white/5'
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <div className="shrink-0">
                                                {sub.status === 'EXISTS' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => toggleSelection(sub.id)}
                                                        className={cn(
                                                            "h-10 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                                            selectedIds.has(sub.id)
                                                                ? "bg-amber-500 border-amber-500 text-amber-950 hover:bg-amber-400"
                                                                : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                                                        )}
                                                    >
                                                        {selectedIds.has(sub.id) ? 'Update Selected' : 'Update'}
                                                    </Button>
                                                ) : (
                                                    <Checkbox
                                                        id={`cb-${sub.id}`}
                                                        checked={selectedIds.has(sub.id)}
                                                        onCheckedChange={() => toggleSelection(sub.id)}
                                                        className="h-7 w-7 rounded-xl border-zinc-800 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-2xl transition-all active:scale-90"
                                                    />
                                                )}
                                            </div>

                                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                                <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-[1.25rem] bg-white shadow-2xl ring-1 ring-white/10 overflow-hidden group-hover:scale-105 transition-transform">
                                                    <img
                                                        src={`https://logo.clearbit.com/${getName(sub).toLowerCase().replace(/\s+/g, '')}.com`}
                                                        alt={getName(sub)}
                                                        className="h-full w-full object-contain p-3"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            target.parentElement!.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-100 font-black text-2xl shadow-inner">${getName(sub)[0]}</div>`;
                                                        }}
                                                    />
                                                </div>

                                                <div className="space-y-1.5 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-heavy text-xl text-white truncate">
                                                            {getName(sub)}
                                                        </span>
                                                        {sub.status === 'NEW' && (
                                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-2 py-0.5 text-[10px] uppercase font-black tracking-widest h-5">
                                                                New Detection
                                                            </Badge>
                                                        )}
                                                        {sub.status === 'EXISTS' && (
                                                            <Badge className="bg-zinc-500/10 text-zinc-500 border-none px-2 py-0.5 text-[10px] uppercase font-black tracking-widest h-5">
                                                                Already Tracking
                                                            </Badge>
                                                        )}
                                                        {sub.status === 'UPDATE' && (
                                                            <Badge className="bg-amber-500/10 text-amber-500 border-none px-2 py-0.5 text-[10px] uppercase font-black tracking-widest h-5 ring-1 ring-amber-500/20">
                                                                Price Changed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-5">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                            <Calendar className="h-4 w-4 text-zinc-600" />
                                                            {format(new Date(getDate(sub)), 'MMM dd, yyyy')}
                                                        </div>
                                                        <button
                                                            onClick={() => toggleExpand(sub.id)}
                                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        >
                                                            <Mail className="h-4 w-4" />
                                                            Details
                                                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-500", expandedIds.has(sub.id) && "rotate-180")} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="text-right shrink-0">
                                                <div className="text-3xl font-black text-white tracking-tighter">
                                                    {formatCurrency(getCost(sub), getCurrency(sub))}
                                                </div>
                                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                                                    {getFrequency(sub) || 'Monthly'} Bill
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-center bg-black/40 p-1.5 rounded-[1.25rem] border border-white/5 shadow-inner">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingId(editingId === sub.id ? null : sub.id)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl transition-all duration-300",
                                                        editingId === sub.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
                                                    )}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeRow(sub.id)}
                                                    className="w-10 h-10 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
                                                >
                                                    <X className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Form */}
                                    {editingId === sub.id && (
                                        <div className="mt-8 p-8 rounded-[2rem] bg-black/60 border border-white/5 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Service Name</label>
                                                    <Input
                                                        value={getName(sub)}
                                                        onChange={(e) => handleEditChange(sub.id, 'name', e.target.value)}
                                                        className="bg-black/40 border-white/5 rounded-2xl h-12 focus:ring-indigo-500 text-sm font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-heavy text-sm">$</span>
                                                        <Input
                                                            type="number"
                                                            value={getCost(sub)}
                                                            onChange={(e) => handleEditChange(sub.id, 'cost', parseFloat(e.target.value))}
                                                            className="bg-black/40 border-white/5 rounded-2xl h-12 pl-8 focus:ring-indigo-500 text-sm font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Billing Date</label>
                                                    <Input
                                                        type="date"
                                                        value={getDate(sub).split('T')[0]}
                                                        onChange={(e) => handleEditChange(sub.id, 'date', new Date(e.target.value).toISOString())}
                                                        className="bg-black/40 border-white/5 rounded-2xl h-12 focus:ring-indigo-500 text-sm font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                        <Clock className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                    <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Changes will be saved on import.</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingId(null)
                                                        if (!selectedIds.has(sub.id)) toggleSelection(sub.id)
                                                    }}
                                                    className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl h-10 px-6 text-xs font-black uppercase tracking-widest transition-all"
                                                >
                                                    Done Editing
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Email Context Preview */}
                                    {expandedIds.has(sub.id) && (
                                        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="rounded-[1.5rem] bg-black/40 border border-white/5 p-6 space-y-4 shadow-inner">
                                                <div className="pb-4 border-b border-white/5">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-2">Subject</p>
                                                    <p className="text-sm font-bold text-zinc-200 italic leading-relaxed">"{sub.subject || 'No Subject'}"</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-2">Snippet</p>
                                                    <p className="text-[13px] text-zinc-400 leading-relaxed font-medium">
                                                        {sub.snippet}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Update Info Section */}
                                    {sub.status === 'UPDATE' && selectedIds.has(sub.id) && !editingId && (
                                        <div className="mt-6 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between shadow-inner">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                                </div>
                                                <span className="text-xs font-black text-amber-500 uppercase tracking-[0.1em]">Legacy Pricing Detected</span>
                                            </div>
                                            <div className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-3">
                                                <span className="text-zinc-600 line-through">{formatCurrency(sub.existing_data!.cost, sub.existing_data!.currency)}</span>
                                                <ArrowRight className="w-4 h-4 text-amber-500" />
                                                <span className="text-white px-3 py-1 bg-amber-500/20 rounded-lg">{formatCurrency(sub.cost, sub.currency)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8 bg-black/60">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-11 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900/50 rounded-2xl px-6 font-black uppercase tracking-widest transition-all"
                            onClick={handleImportAllNew}
                            disabled={isImporting || isScanning}
                        >
                            Import All New
                        </Button>
                        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                                {selectedIds.size} Ready to Sync
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isImporting || isScanning}
                            className="text-zinc-500 h-11 hover:text-white hover:bg-zinc-900 rounded-2xl px-8 font-heavy text-sm transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || isScanning || selectedIds.size === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-14 px-12 rounded-[1.5rem] min-w-[240px] shadow-[0_0_40px_rgba(99,102,241,0.25)] transition-all hover:scale-[1.03] active:scale-[0.97]"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                    Synchronizing...
                                </>
                            ) : (
                                <>
                                    Complete Import
                                    <ArrowRight className="w-6 h-6 ml-3" />
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
