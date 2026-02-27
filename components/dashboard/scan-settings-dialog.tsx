"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar, Clock, Inbox } from "lucide-react"

interface ScanSettingsDialogProps {
    trigger: React.ReactNode
    onScan: (days: number) => void
    isScanning: boolean
}

export function ScanSettingsDialog({ trigger, onScan, isScanning }: ScanSettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [days, setDays] = useState("30")

    // Load saved preference on mount
    useEffect(() => {
        const saved = localStorage.getItem("gmail_scan_range")
        if (saved) setDays(saved)
    }, [])

    const handleScan = () => {
        const val = parseInt(days)
        localStorage.setItem("gmail_scan_range", days)
        onScan(val)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] gap-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Inbox className="h-5 w-5 text-indigo-500" />
                        Scan Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure how far back we should look for potential subscriptions and bills in your inbox.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <RadioGroup defaultValue="30" value={days} onValueChange={setDays} className="grid grid-cols-1 gap-4">
                        <Label
                            htmlFor="opt-30"
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted cursor-pointer [&:has([data-state=checked])]:border-primary"
                        >
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="30" id="opt-30" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Last 30 Days</p>
                                    <p className="text-xs text-muted-foreground">Fastest. detailed recent check.</p>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md dark:bg-emerald-950/30 dark:text-emerald-400">Fast</span>
                        </Label>

                        <Label
                            htmlFor="opt-90"
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted cursor-pointer [&:has([data-state=checked])]:border-primary"
                        >
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="90" id="opt-90" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Last 90 Days</p>
                                    <p className="text-xs text-muted-foreground">Standard. Good for quarterly bills.</p>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md dark:bg-blue-950/30 dark:text-blue-400">Standard</span>
                        </Label>

                        <Label
                            htmlFor="opt-365"
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted cursor-pointer [&:has([data-state=checked])]:border-primary"
                        >
                            <div className="flex items-center gap-4">
                                <RadioGroupItem value="365" id="opt-365" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">This Year (365 Days)</p>
                                    <p className="text-xs text-muted-foreground">Slowest. Deep history scan.</p>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md dark:bg-amber-950/30 dark:text-amber-400">Slow</span>
                        </Label>
                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleScan} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                        <Clock className="h-4 w-4" /> Start Scan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
