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
    Trash2,
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
        let failCount = 0

        // Process each item individually to prevent one failure from stopping the whole batch
        for (const sub of items) {
            try {
                const finalSub = {
                    ...sub,
                    ...localEdits[sub.id]
                }

                if ((sub.status === 'UPDATE' || sub.status === 'EXISTS')) {
                    // CRITICAL FIX: Ensure existing_id is valid before updating
                    if (!sub.existing_id) {
                        console.warn(`Skipping update for ${sub.name}: No existing_id found`)
                        failCount++
                        continue
                    }

                    // Check if values are actually different (Ghost Delta check)
                    // If prices are identical, we still proceed to link/update metadata if needed,
                    // but logic inside updateSubscription should handle it gracefully.

                    const result = await updateSubscription(sub.existing_id, {
                        name: finalSub.name,
                        cost: finalSub.cost,
                        renewal_date: finalSub.date
                    })

                    if (result.success) {
                        successCount++
                    } else {
                        console.error(`Failed to update ${sub.name}:`, result)
                        failCount++
                    }
                } else {
                    const result = await addSubscription({
                        name: finalSub.name,
                        cost: finalSub.cost,
                        currency: finalSub.currency,
                        frequency: finalSub.frequency,
                        renewal_date: finalSub.date,
                        category: 'Software'
                    })

                    if (result.success) {
                        successCount++
                    } else {
                        console.error(`Failed to add ${sub.name}:`, result)
                        failCount++
                    }
                }
            } catch (err) {
                console.error(`Error processing subscription ${sub.name}:`, err)
                failCount++
            }
        }

        setIsImporting(false)

        if (successCount > 0) {
            toast.success(`Processed ${successCount} subscriptions`, {
                description: failCount > 0 ? `${failCount} failed to import.` : "Your dashboard has been refreshed.",
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            })
            onImportComplete()
            onClose()
        } else if (failCount > 0) {
            toast.error(`Import failed`, {
                description: `Failed to process ${failCount} subscriptions. Please try again.`
            })
        } else {
            // Should not happen if items.length > 0
            onClose()
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        try {
            // Map currency symbols to ISO codes to prevent RangeError
            const symbolToIso: Record<string, string> = { "€": "EUR", "$": "USD", "£": "GBP", "¥": "JPY" }
            const safeCurrency = (currency || "USD").trim()
            const isoCode = symbolToIso[safeCurrency] || safeCurrency.toUpperCase()

            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: isoCode,
            }).format(amount)
        } catch (error) {
            // Fallback: NEVER crash the UI
            console.warn("[GmailImportModal] Currency format failed, using fallback:", error)
            return `${currency} ${amount.toFixed(2)}`
        }
    }
    const visibleSubscriptions = useMemo(() => {
        return foundSubscriptions.filter(s => !removedIds.has(s.id))
    }, [foundSubscriptions, removedIds])

    const isAllSelected = useMemo(() => {
        return visibleSubscriptions.length > 0 &&
            visibleSubscriptions.every(sub => selectedIds.has(sub.id))
    }, [visibleSubscriptions, selectedIds])

    const handleSelectAll = (checked: boolean) => {
        const next = new Set(selectedIds)
        visibleSubscriptions.forEach(sub => {
            if (checked) next.add(sub.id)
            else next.delete(sub.id)
        })
        setSelectedIds(next)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isImporting && !isScanning && !open && onClose()}>
            <DialogContent className="sm:max-w-4xl bg-zinc-950 border-white/10 text-zinc-50 overflow-hidden p-0 gap-0 shadow-2xl flex flex-col h-[80vh] max-h-[750px] rounded-[2.5rem]">
                {/* Fixed Header */}
                <div className="p-8 border-b border-white/5 bg-white/5 shrink-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                                <Receipt className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">Import Hub</DialogTitle>
                                <DialogDescription className="text-zinc-500 font-bold text-base mt-0.5">
                                    Review and sync detections from your inbox.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white rounded-2xl h-11 px-6 gap-3 font-bold text-sm">
                                        <Clock className="w-4 h-4" />
                                        Last {timeRange} Days
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 p-2 rounded-2xl">
                                    {[30, 60, 90].map((days) => (
                                        <DropdownMenuItem
                                            key={days}
                                            onClick={() => {
                                                setTimeRange(days)
                                                onRescan(days)
                                            }}
                                            className="text-zinc-400 focus:text-white rounded-xl h-10 px-4 cursor-pointer"
                                        >
                                            Last {days} Days
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Sticky Selection Bar */}
                <div className="px-8 py-5 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Checkbox
                            id="select-all"
                            checked={isAllSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            className="h-6 w-6 rounded-lg border-zinc-800 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-xl"
                        />
                        <label htmlFor="select-all" className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 cursor-pointer select-none hover:text-zinc-200 transition-colors">
                            Select All Detections
                        </label>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                            {visibleSubscriptions.length} Found
                        </span>
                    </div>
                </div>

                {/* Scrollable List Container */}
                <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">
                    <div className="space-y-4 py-8">
                        {isScanning ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-8">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full animate-pulse" />
                                    <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-white font-heavy text-2xl">Syncing Inbox...</p>
                                    <p className="text-zinc-500 text-sm">Identifying your subscription patterns</p>
                                </div>
                            </div>
                        ) : visibleSubscriptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-8">
                                <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5 shadow-2xl">
                                    <ShieldCheck className="w-12 h-12 text-zinc-600" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-white font-heavy text-2xl uppercase tracking-tight">No Detections</p>
                                    <p className="text-zinc-500 text-sm">We couldn't find any recent receipts in this range.</p>
                                </div>
                            </div>
                        ) : (
                            visibleSubscriptions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className={cn(
                                        "group relative flex flex-col p-6 rounded-[2.5rem] border transition-all duration-500",
                                        sub.status === 'EXISTS' && !selectedIds.has(sub.id) ? 'bg-zinc-950/40 border-white/5 opacity-60' :
                                            selectedIds.has(sub.id) ? 'bg-zinc-900/95 border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.12)] ring-1 ring-indigo-500/30' :
                                                'bg-zinc-900/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-white/5'
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <div className="shrink-0 flex items-center justify-center">
                                                {sub.status === 'EXISTS' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => toggleSelection(sub.id)}
                                                        className={cn(
                                                            "h-11 px-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                                                            selectedIds.has(sub.id)
                                                                ? "bg-amber-500 border-amber-500 text-amber-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                                                                : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                                                        )}
                                                    >
                                                        {selectedIds.has(sub.id) ? 'Syncing' : 'Sync'}
                                                    </Button>
                                                ) : (
                                                    <Checkbox
                                                        id={`cb-${sub.id}`}
                                                        checked={selectedIds.has(sub.id)}
                                                        onCheckedChange={() => toggleSelection(sub.id)}
                                                        className="h-8 w-8 rounded-xl border-zinc-800 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-2xl transition-all active:scale-90"
                                                    />
                                                )}
                                            </div>

                                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                                <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-[1.25rem] bg-white shadow-2xl ring-1 ring-white/10 overflow-hidden group-hover:scale-110 transition-transform duration-500">
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
                                                        <span className="font-heavy text-xl text-white truncate drop-shadow-sm">
                                                            {getName(sub)}
                                                        </span>
                                                        {sub.status === 'NEW' && (
                                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-2.5 py-0.5 text-[10px] uppercase font-black tracking-widest h-5">
                                                                New
                                                            </Badge>
                                                        )}
                                                        {sub.status === 'UPDATE' && (
                                                            <Badge className="bg-amber-500/10 text-amber-500 border-none px-2.5 py-0.5 text-[10px] uppercase font-black tracking-widest h-5 ring-1 ring-amber-500/20">
                                                                Updated
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                            <Calendar className="h-4 w-4 text-zinc-600" />
                                                            {format(new Date(getDate(sub)), 'MMM dd, yyyy')}
                                                        </div>
                                                        <button
                                                            onClick={() => toggleExpand(sub.id)}
                                                            className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        >
                                                            <Mail className="h-4 w-4" />
                                                            Details
                                                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-500", expandedIds.has(sub.id) && "rotate-180")} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 flex-1 justify-end">
                                            <div className="text-right shrink-0">
                                                <div className="text-3xl font-black text-white tracking-tighter drop-shadow-md">
                                                    {formatCurrency(getCost(sub), getCurrency(sub))}
                                                </div>
                                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                                                    {getFrequency(sub) || 'Monthly'} Bill
                                                </div>
                                            </div>

                                            {/* Hard-coded Row Actions */}
                                            <div className="flex items-center gap-2 ml-4 shrink-0 bg-black/60 p-2 rounded-2xl border border-white/10 shadow-2xl">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setEditingId(editingId === sub.id ? null : sub.id)
                                                    }}
                                                    className={cn(
                                                        "h-10 w-10 rounded-xl transition-all duration-300",
                                                        editingId === sub.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                    )}
                                                >
                                                    <Pencil className="h-5 w-5" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        removeRow(sub.id)
                                                    }}
                                                    className="h-10 w-10 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Hub */}
                                    {editingId === sub.id && (
                                        <div className="mt-8 p-10 rounded-[3rem] bg-black border border-white/10 space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-inner">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Merchant Name</label>
                                                    <Input
                                                        value={getName(sub)}
                                                        onChange={(e) => handleEditChange(sub.id, 'name', e.target.value)}
                                                        className="bg-zinc-900/50 border-white/5 rounded-2xl h-14 focus:ring-indigo-500 text-base font-bold px-6"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 font-heavy text-lg">$</span>
                                                        <Input
                                                            type="number"
                                                            value={getCost(sub)}
                                                            onChange={(e) => handleEditChange(sub.id, 'cost', parseFloat(e.target.value))}
                                                            className="bg-zinc-900/50 border-white/5 rounded-2xl h-14 pl-12 focus:ring-indigo-500 text-base font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Billing Date</label>
                                                    <Input
                                                        type="date"
                                                        value={getDate(sub).split('T')[0]}
                                                        onChange={(e) => handleEditChange(sub.id, 'date', new Date(e.target.value).toISOString())}
                                                        className="bg-zinc-900/50 border-white/5 rounded-2xl h-14 focus:ring-indigo-500 text-base font-bold px-6"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                        <Clock className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Settings will persist to your dashboard on import.</p>
                                                </div>
                                                <Button
                                                    size="lg"
                                                    onClick={() => {
                                                        setEditingId(null)
                                                        if (!selectedIds.has(sub.id)) toggleSelection(sub.id)
                                                    }}
                                                    className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl h-14 px-10 text-sm font-black uppercase tracking-widest transition-all shadow-xl"
                                                >
                                                    Apply Changes
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Intelligence Preview */}
                                    {expandedIds.has(sub.id) && (
                                        <div className="mt-6 animate-in fade-in slide-in-from-top-6 duration-500">
                                            <div className="rounded-[2rem] bg-black/40 border border-white/5 p-8 space-y-6 shadow-2xl">
                                                <div className="pb-6 border-b border-white/5">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-3">Email Subject</p>
                                                    <p className="text-base font-bold text-zinc-200 indent-2 italic leading-relaxed">"{sub.subject || 'No Subject'}"</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-3">Data Snippet</p>
                                                    <p className="text-[14px] text-zinc-400 leading-relaxed font-medium indent-2">
                                                        {sub.snippet}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Delta Context - Only show if prices are DIFFERENT */}
                                    {sub.status === 'UPDATE' &&
                                        selectedIds.has(sub.id) &&
                                        !editingId &&
                                        sub.existing_data &&
                                        sub.existing_data.cost !== sub.cost && (
                                            <div className="mt-6 p-6 rounded-[2.25rem] bg-amber-500/5 border border-amber-500/20 flex items-center justify-between shadow-2xl">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                                                        <AlertTriangle className="h-6 w-6 text-amber-500" />
                                                    </div>
                                                    <span className="text-sm font-black text-amber-500 uppercase tracking-[0.15em]">Subscription Delta Found</span>
                                                </div>
                                                <div className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-4">
                                                    <span className="text-zinc-600 line-through decoration-zinc-800 decoration-2">{formatCurrency(sub.existing_data.cost, sub.existing_data.currency)}</span>
                                                    <ArrowRight className="w-5 h-5 text-amber-500" />
                                                    <span className="text-white px-5 py-2 bg-amber-500/20 rounded-xl border border-amber-500/20">{formatCurrency(sub.cost, sub.currency)}</span>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-8 bg-black shrink-0">
                    <div className="flex items-center gap-8">
                        <Button
                            variant="outline"
                            size="lg"
                            className="text-[11px] h-14 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-900/40 rounded-[1.5rem] px-8 font-black uppercase tracking-widest transition-all"
                            onClick={handleImportAllNew}
                            disabled={isImporting || isScanning}
                        >
                            Sync All New
                        </Button>
                        <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                                {selectedIds.size} Ready to Import
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isImporting || isScanning}
                            className="text-zinc-500 h-14 hover:text-white hover:bg-zinc-900 rounded-2xl px-10 font-heavy text-base transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || isScanning || selectedIds.size === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-16 px-16 rounded-[2rem] min-w-[280px] shadow-[0_0_50px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.04] active:scale-[0.96]"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-6 h-6 mr-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Complete Import {selectedIds.size > 0 && `(${selectedIds.size})`}
                                    <ArrowRight className="w-7 h-7 ml-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
