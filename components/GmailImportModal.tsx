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
    Filter,
    HelpCircle
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { addSubscription, updateSubscription } from '@/app/actions/subscriptions'
import { cn } from '@/lib/utils'
import { safeFormatDate, safeDateInputValue } from '@/lib/utils/currency'

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
    range?: number
}

export function GmailImportModal({
    isOpen,
    onClose,
    foundSubscriptions,
    onImportComplete,
    onRescan,
    isScanning,
    range = 90
}: GmailImportModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [localEdits, setLocalEdits] = useState<Record<string, Partial<DetectedSubscription>>>({})
    const [timeRange, setTimeRange] = useState(range)

    // Sync state with prop if it changes
    useEffect(() => {
        if (range) setTimeRange(range)
    }, [range])
    const [isImporting, setIsImporting] = useState(false)
    const router = useRouter()

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
            router.refresh()
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
            <DialogContent className="sm:max-w-4xl bg-background border-border text-foreground overflow-hidden p-0 gap-0 shadow-2xl flex flex-col h-[90vh] sm:h-[80vh] max-h-[750px] rounded-t-[2.5rem] sm:rounded-[2.5rem]">
                {/* Fixed Header */}
                <div className="p-6 sm:p-8 border-b border-border bg-muted/30 shrink-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                                <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Import Hub</DialogTitle>
                                <DialogDescription className="text-muted-foreground font-bold text-sm sm:text-base mt-0.5">
                                    Review and sync detections from your inbox.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="bg-background border-border text-muted-foreground hover:text-foreground rounded-2xl h-11 px-6 gap-3 font-bold text-sm">
                                        <Clock className="w-4 h-4" />
                                        Last {timeRange} Days
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover border-border p-2 rounded-2xl">
                                    {[30, 60, 90].map((days) => (
                                        <DropdownMenuItem
                                            key={days}
                                            onClick={() => {
                                                setTimeRange(days)
                                                onRescan(days)
                                            }}
                                            className="text-muted-foreground focus:text-foreground rounded-xl h-10 px-4 cursor-pointer"
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
                <div className="px-6 sm:px-8 py-4 border-b border-border bg-muted/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Checkbox
                            id="select-all"
                            checked={isAllSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            className="h-6 w-6 rounded-lg border-input data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-sm"
                        />
                        <label htmlFor="select-all" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                            Select All Detections
                        </label>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
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
                                    <p className="text-foreground font-heavy text-2xl">Syncing Inbox...</p>
                                    <p className="text-muted-foreground text-sm">Identifying your subscription patterns</p>
                                </div>
                            </div>
                        ) : visibleSubscriptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-8">
                                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border border-border shadow-2xl">
                                    <ShieldCheck className="w-12 h-12 text-muted-foreground" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-foreground font-heavy text-2xl uppercase tracking-tight">No Detections</p>
                                    <p className="text-muted-foreground text-sm">We couldn't find any recent receipts in this range.</p>
                                </div>
                            </div>
                        ) : (
                            visibleSubscriptions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className={cn(
                                        "group relative flex flex-col p-6 rounded-[2.5rem] border transition-all duration-500",
                                        sub.status === 'EXISTS' && !selectedIds.has(sub.id) ? 'bg-muted/20 border-border opacity-60' :
                                            selectedIds.has(sub.id) ? 'bg-card border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.12)] ring-1 ring-indigo-500/30' :
                                                'bg-muted/10 border-transparent hover:bg-muted/30 hover:border-border'
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
                                                                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {selectedIds.has(sub.id) ? 'Syncing' : 'Sync'}
                                                    </Button>
                                                ) : (
                                                    <Checkbox
                                                        id={`cb-${sub.id}`}
                                                        checked={selectedIds.has(sub.id)}
                                                        onCheckedChange={() => toggleSelection(sub.id)}
                                                        className="h-8 w-8 rounded-xl border-input data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-sm transition-all active:scale-90"
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
                                                        <span className="font-heavy text-lg sm:text-xl text-foreground truncate drop-shadow-sm">
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
                                                        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                            <Calendar className="h-4 w-4 text-muted-foreground/60" />
                                                            {safeFormatDate(getDate(sub), { month: 'short', day: '2-digit', year: 'numeric' })}
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

                                        <div className="flex items-center gap-4 sm:gap-8 flex-1 justify-end">
                                            <div className="text-right shrink-0">
                                                    {(getCost(sub) === 0 || getCost(sub) === null || getCost(sub) === undefined) ? (
                                                        <div className="flex items-center gap-2 text-amber-500 font-medium">
                                                            <span className="text-sm sm:text-base">Price unknown</span>
                                                            <AlertTriangle className="h-4 w-4" />
                                                        </div>
                                                    ) : (
                                                        <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter drop-shadow-sm">
                                                            {formatCurrency(getCost(sub), getCurrency(sub))}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mt-0.5">
                                                        {getFrequency(sub) || 'Monthly'} Bill
                                                    </div>
                                                </div>                                            {/* Row Actions */}
                                                <div className="flex items-center gap-2 ml-4 shrink-0 bg-muted/50 p-2 rounded-2xl border border-border shadow-sm">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setEditingId(editingId === sub.id ? null : sub.id)
                                                        }}
                                                        className={cn(
                                                            "h-10 w-10 rounded-xl transition-all duration-300",
                                                            editingId === sub.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-muted-foreground hover:bg-background hover:text-foreground",
                                                            (getCost(sub) === 0 || getCost(sub) === null || getCost(sub) === undefined) && "border-2 border-amber-500/50"
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
                                                    className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Hub */}
                                    {editingId === sub.id && (
                                        <div className="mt-8 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-muted/40 border border-border space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-inner">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Merchant Name</label>
                                                    <Input
                                                        value={getName(sub)}
                                                        onChange={(e) => handleEditChange(sub.id, 'name', e.target.value)}
                                                        className="bg-background border-border rounded-2xl h-14 focus:ring-indigo-500 text-base font-bold px-6"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-heavy text-lg">$</span>
                                                        <Input
                                                            type="number"
                                                            value={getCost(sub)}
                                                            onChange={(e) => handleEditChange(sub.id, 'cost', parseFloat(e.target.value))}
                                                            className="bg-background border-border rounded-2xl h-14 pl-12 focus:ring-indigo-500 text-base font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Billing Date</label>
                                                    <Input
                                                        type="date"
                                                        value={safeDateInputValue(getDate(sub))}
                                                        onChange={(e) => handleEditChange(sub.id, 'date', new Date(e.target.value).toISOString())}
                                                        className="bg-background border-border rounded-2xl h-14 focus:ring-indigo-500 text-base font-bold px-6"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t border-border">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Settings will persist to your dashboard on import.</p>
                                                </div>
                                                <Button
                                                    size="lg"
                                                    onClick={() => {
                                                        setEditingId(null)
                                                        if (!selectedIds.has(sub.id)) toggleSelection(sub.id)
                                                    }}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-10 text-sm font-black uppercase tracking-widest transition-all shadow-xl w-full sm:w-auto"
                                                >
                                                    Apply Changes
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Intelligence Preview */}
                                    {expandedIds.has(sub.id) && (
                                        <div className="mt-6 animate-in fade-in slide-in-from-top-6 duration-500">
                                            <div className="rounded-[2rem] bg-muted/30 border border-border p-6 sm:p-8 space-y-6 shadow-sm">
                                                <div className="pb-6 border-b border-border">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-3">Email Subject</p>
                                                    <p className="text-sm sm:text-base font-bold text-foreground indent-2 italic leading-relaxed">"{sub.subject || 'No Subject'}"</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-3">Data Snippet</p>
                                                    <p className="text-[14px] text-muted-foreground leading-relaxed font-medium indent-2">
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
                                            <div className="mt-6 p-4 sm:p-6 rounded-[2.25rem] bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                                                <div className="flex items-center gap-5 self-start sm:self-auto">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                                                        <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-500" />
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-500 uppercase tracking-[0.15em]">Subscription Delta Found</span>
                                                </div>
                                                <div className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-4">
                                                    <span className="text-muted-foreground/60 line-through decoration-muted-foreground/40 decoration-2">{formatCurrency(sub.existing_data.cost, sub.existing_data.currency)}</span>
                                                    <ArrowRight className="w-5 h-5 text-amber-500" />
                                                    <span className="text-foreground px-5 py-2 bg-amber-500/20 rounded-xl border border-amber-500/20">{formatCurrency(sub.cost, sub.currency)}</span>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-6 sm:p-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 bg-background shrink-0">
                    <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        <Button
                            variant="outline"
                            size="lg"
                            className="text-[11px] h-14 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground hover:bg-muted/40 rounded-[1.5rem] px-8 font-black uppercase tracking-widest transition-all whitespace-nowrap"
                            onClick={handleImportAllNew}
                            disabled={isImporting || isScanning}
                        >
                            Sync All New
                        </Button>
                        <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-sm shrink-0">
                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] sm:text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                                {selectedIds.size} Ready
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isImporting || isScanning}
                            className="text-muted-foreground h-14 hover:text-foreground hover:bg-muted rounded-2xl px-10 font-heavy text-base transition-all w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full sm:w-auto">
                                        <Button
                                            onClick={handleImport}
                                            disabled={isImporting || isScanning || selectedIds.size === 0}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-16 px-16 rounded-[2rem] sm:min-w-[280px] shadow-[0_10px_40px_rgba(79,70,229,0.25)] dark:shadow-[0_0_50px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.04] active:scale-[0.96] w-full sm:w-auto"
                                        >
                                            {isImporting ? (
                                                <div className="flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 mr-4 animate-spin" />
                                                    Processing...
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    Sync {selectedIds.size > 0 && selectedIds.size}
                                                    <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 ml-4" />
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                {visibleSubscriptions.some(s => selectedIds.has(s.id) && (getCost(s) === 0 || getCost(s) === null || getCost(s) === undefined)) && (
                                    <TooltipContent className="bg-amber-500 text-amber-950 font-bold border-amber-600">
                                        <p>Price unknown — you can edit this after syncing</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
