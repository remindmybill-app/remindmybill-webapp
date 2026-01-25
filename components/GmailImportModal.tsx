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
        const onlyNew = foundSubscriptions.filter(s => s.status === 'NEW')
        await startImport(onlyNew)
    }

    const handleImport = async () => {
        const toProcess = foundSubscriptions.filter(s => selectedIds.has(s.id))
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

                if (sub.status === 'UPDATE' && sub.existing_id) {
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isImporting && !isScanning && !open && onClose()}>
            <DialogContent className="sm:max-w-3xl bg-zinc-950/90 backdrop-blur-2xl border-white/10 text-zinc-50 overflow-hidden p-0 gap-0 shadow-2xl">
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

                <ScrollArea className="max-h-[60vh] px-6">
                    <div className="space-y-4 py-6">
                        {isScanning ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                <div className="text-center">
                                    <p className="text-white font-bold text-lg">Scanning your inbox...</p>
                                    <p className="text-zinc-500 text-sm">Analyzing emails for subscription patterns</p>
                                </div>
                            </div>
                        ) : foundSubscriptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                                    <ShieldCheck className="w-8 h-8 text-zinc-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-bold text-lg">No new bills found</p>
                                    <p className="text-zinc-500 text-sm">We couldn't find any recent subscription receipts.</p>
                                </div>
                            </div>
                        ) : (
                            foundSubscriptions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className={cn(
                                        "group relative flex flex-col p-5 rounded-[2rem] border transition-all duration-500",
                                        sub.status === 'EXISTS' ? 'bg-zinc-950/40 border-white/5 opacity-70' :
                                            selectedIds.has(sub.id) ? 'bg-zinc-900/80 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.05)] ring-1 ring-indigo-500/20' :
                                                'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/60'
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-5 flex-1 min-w-0">
                                            <div className="shrink-0">
                                                <Checkbox
                                                    id={`cb-${sub.id}`}
                                                    checked={selectedIds.has(sub.id)}
                                                    disabled={sub.status === 'EXISTS' && !localEdits[sub.id]}
                                                    onCheckedChange={() => toggleSelection(sub.id)}
                                                    className="h-6 w-6 rounded-lg border-zinc-800 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 shadow-xl transition-transform active:scale-90"
                                                />
                                            </div>

                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-white shadow-2xl ring-1 ring-white/10 overflow-hidden">
                                                    <img
                                                        src={`https://logo.clearbit.com/${getName(sub).toLowerCase().replace(/\s+/g, '')}.com`}
                                                        alt={getName(sub)}
                                                        className="h-full w-full object-contain p-2.5"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            target.parentElement!.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-zinc-800 text-zinc-400 font-black text-2xl">${getName(sub)[0]}</div>`;
                                                        }}
                                                    />
                                                </div>

                                                <div className="space-y-1.5 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-lg text-white truncate">
                                                            {getName(sub)}
                                                        </span>
                                                        {sub.status === 'NEW' && (
                                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-2 py-0 text-[10px] uppercase font-black tracking-widest h-5">
                                                                New
                                                            </Badge>
                                                        )}
                                                        {sub.status === 'EXISTS' && (
                                                            <Badge className="bg-zinc-500/10 text-zinc-500 border-none px-2 py-0 text-[10px] uppercase font-black tracking-widest h-5">
                                                                Already Tracking
                                                            </Badge>
                                                        )}
                                                        {sub.status === 'UPDATE' && (
                                                            <Badge className="bg-amber-500/10 text-amber-500 border-none px-2 py-0 text-[10px] uppercase font-black tracking-widest h-5 ring-1 ring-amber-500/20">
                                                                Price Match Found
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {format(new Date(getDate(sub)), 'MMM dd, yyyy')}
                                                        </div>
                                                        <button
                                                            onClick={() => toggleExpand(sub.id)}
                                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        >
                                                            <Mail className="h-3.5 w-3.5" />
                                                            Email Source
                                                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", expandedIds.has(sub.id) && "rotate-180")} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right shrink-0">
                                                <div className="text-2xl font-black text-white tracking-tighter">
                                                    {formatCurrency(getCost(sub), getCurrency(sub))}
                                                </div>
                                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                                                    {getFrequency(sub) || 'Monthly'} Bill
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingId(editingId === sub.id ? null : sub.id)}
                                                className={cn(
                                                    "w-10 h-10 rounded-xl transition-all",
                                                    editingId === sub.id ? "bg-indigo-500 text-white" : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
                                                )}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Edit Form */}
                                    {editingId === sub.id && (
                                        <div className="mt-6 p-6 rounded-3xl bg-zinc-950/50 border border-white/5 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Service Name</label>
                                                    <Input
                                                        value={getName(sub)}
                                                        onChange={(e) => handleEditChange(sub.id, 'name', e.target.value)}
                                                        className="bg-black border-white/5 rounded-2xl h-11 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                                        <Input
                                                            type="number"
                                                            value={getCost(sub)}
                                                            onChange={(e) => handleEditChange(sub.id, 'cost', parseFloat(e.target.value))}
                                                            className="bg-black border-white/5 rounded-2xl h-11 pl-7 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                                    <span className="text-[11px] text-zinc-500 font-medium">Pricing and name will be saved on import.</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingId(null)
                                                        if (!selectedIds.has(sub.id)) toggleSelection(sub.id)
                                                    }}
                                                    className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl h-9 px-4 text-xs font-bold"
                                                >
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Email Context Preview */}
                                    {expandedIds.has(sub.id) && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="rounded-2xl bg-black/60 border border-white/5 p-4 space-y-3">
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

                                    {/* Update Info Section */}
                                    {sub.status === 'UPDATE' && selectedIds.has(sub.id) && !editingId && (
                                        <div className="mt-5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Pricing has changed</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-bold">
                                                Old: {formatCurrency(sub.existing_data!.cost, sub.existing_data!.currency)} → New: {formatCurrency(sub.cost, sub.currency)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/40">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-10 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-2xl px-5 font-black uppercase tracking-widest"
                            onClick={handleImportAllNew}
                            disabled={isImporting || isScanning}
                        >
                            Import All New
                        </Button>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                                {selectedIds.size} Selected
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isImporting || isScanning}
                            className="text-zinc-500 h-10 hover:text-white hover:bg-zinc-900 rounded-2xl px-6 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || isScanning || selectedIds.size === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest h-12 px-10 rounded-2xl min-w-[200px] shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    Complete Import
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
