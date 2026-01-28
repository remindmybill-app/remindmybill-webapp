import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Check, Lock, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import type { Subscription } from "@/lib/types"
import { useProfile } from "@/lib/hooks/use-profile"
import Link from "next/link"
import { getTierDisplayName } from "@/lib/subscription-utils"
import { useRouter } from "next/navigation"

const formSchema = z.object({
    name: z.string().min(1, "Service name is required"),
    cost: z.string().min(1, "Cost is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Cost must be a positive number"),
    currency: z.string().min(1, "Currency is required"),
    frequency: z.string().min(1, "Frequency is required"),
    renewalDate: z.date({
        required_error: "Renewal date is required",
    }),
    isTrial: z.boolean().default(false),
    category: z.string().min(1, "Category is required"),
    sharedWithCount: z.string().min(1, "Required").refine((val) => !isNaN(Number(val)) && Number(val) >= 1, "Must be at least 1"),
})

const categories = [
    "Entertainment",
    "Software",
    "Utility",
    "Gym/Fitness",
    "Food/Drink",
    "Cloud Services",
    "Gaming",
    "Other"
]

const popularServices = [
    "Netflix", "Spotify", "Amazon Prime", "Disney+", "Hulu",
    "Adobe Creative Cloud", "Microsoft 365", "Google One",
    "Dropbox", "Planet Fitness", "HelloFresh", "Uber One", "ChatGPT Plus"
]

interface ManualSubscriptionModalProps {
    onSubscriptionAdded: () => void
    subscriptionToEdit?: Subscription | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function ManualSubscriptionModal({ onSubscriptionAdded, subscriptionToEdit, open: controlledOpen, onOpenChange, trigger }: ManualSubscriptionModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState<Date>()
    const [serviceOpen, setServiceOpen] = useState(false)
    const { profile } = useProfile()
    const router = useRouter()

    // Derived state for controlled/uncontrolled
    const isOpen = controlledOpen ?? internalOpen
    const setIsOpen = onOpenChange ?? setInternalOpen

    const { register, handleSubmit, setValue, watch, reset, formState: { errors, isValid } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            currency: "USD",
            frequency: "monthly",
            isTrial: false,
            category: "Entertainment",
            sharedWithCount: "1",
        }
    })

    // Reset/Populate form when modal opens or subscriptionToEdit changes
    useEffect(() => {
        if (isOpen) {
            if (subscriptionToEdit) {
                setValue("name", subscriptionToEdit.name)
                setValue("cost", String(subscriptionToEdit.cost))
                setValue("currency", subscriptionToEdit.currency)
                setValue("frequency", subscriptionToEdit.frequency)
                setValue("category", subscriptionToEdit.category)
                setValue("isTrial", false)
                setValue("sharedWithCount", String(subscriptionToEdit.shared_with_count || 1))

                if (subscriptionToEdit.renewal_date) {
                    const rDate = new Date(subscriptionToEdit.renewal_date)
                    setDate(rDate)
                    setValue("renewalDate", rDate)
                }
            } else {
                reset({
                    currency: "USD",
                    frequency: "monthly",
                    isTrial: false,
                    category: "Entertainment",
                    sharedWithCount: "1",
                })
                setDate(undefined)
            }
        }
    }, [isOpen, subscriptionToEdit, setValue, reset])


    const isTrial = watch("isTrial")

    // Date picker handler
    const handleDateSelect = (date: Date | undefined) => {
        setDate(date)
        if (date) {
            setValue("renewalDate", date, { shouldValidate: true })
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        const supabase = createClient()

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                console.error("Auth error:", userError)
                toast.error("You must be logged in to add a subscription")
                return
            }

            if (subscriptionToEdit) {
                // UPDATE existing
                const { error } = await supabase.from('subscriptions').update({
                    name: values.name,
                    cost: Number(values.cost),
                    currency: values.currency,
                    frequency: values.frequency,
                    renewal_date: values.renewalDate.toISOString(),
                    category: values.category,
                    shared_with_count: Number(values.sharedWithCount),
                }).eq('id', subscriptionToEdit.id)

                if (error) throw error
                toast.success("Subscription updated")

            } else {
                // INSERT new
                const { error } = await supabase.from('subscriptions').insert({
                    user_id: user.id,
                    name: values.name,
                    cost: Number(values.cost),
                    currency: values.currency,
                    frequency: values.frequency,
                    renewal_date: values.renewalDate.toISOString(),
                    status: values.isTrial ? "active" : "active",
                    category: values.category,
                    trust_score: 50,
                    shared_with_count: Number(values.sharedWithCount),
                })
                if (error) throw error
                toast.success("Subscription added successfully")

                // Insert Notification
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    type: 'info',
                    title: 'New Subscription',
                    message: `Tracking started for ${values.name}`,
                    read: false,
                })
            }

            setIsOpen(false)
            reset()
            setDate(undefined)
            onSubscriptionAdded() // This calls refreshSubscriptions in parent
            router.refresh()
        } catch (error: any) {
            console.error("Error saving subscription:", error)
            toast.error(error.message || "Operation failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="h-4 w-4" />
                        Add Manually
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-2xl overflow-hidden p-0 gap-0">
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-rose-500/10 pointer-events-none" />

                <DialogHeader className="p-6 pb-2 relative z-10 border-b border-black/5 dark:border-white/10 space-y-1">
                    <DialogTitle className="text-xl font-bold tracking-tight">{subscriptionToEdit ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Track a new recurring expense automatically.
                    </DialogDescription>
                </DialogHeader>

                {/* Limit Enforcement - Show "Limit Reached" Card if at capacity */}
                {!subscriptionToEdit && profile && profile.current_usage >= profile.subscription_limit ? (
                    <div className="p-6 space-y-6 relative z-10">
                        {/* Limit Reached Card */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 via-orange-500/5 to-amber-500/10 border border-rose-200/50 dark:border-rose-500/20 p-8 text-center">
                            <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-sm" />

                            <div className="relative z-10 space-y-4">
                                {/* Lock Icon */}
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30">
                                    <Lock className="h-8 w-8 text-white" />
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold tracking-tight">Subscription Limit Reached</h3>

                                {/* Message */}
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    You've reached your <span className="font-semibold capitalize">{getTierDisplayName(profile.subscription_tier)}</span> plan limit of{' '}
                                    <span className="font-bold text-foreground">{profile.subscription_limit}</span> subscriptions.
                                </p>

                                {/* Usage Stats */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 dark:bg-white/5 text-sm font-medium">
                                    <Sparkles className="h-4 w-4 text-orange-500" />
                                    <span>{profile.current_usage} / {profile.subscription_limit} subscriptions tracked</span>
                                </div>

                                {/* CTA Button */}
                                <Button
                                    asChild
                                    size="lg"
                                    className="w-full mt-4 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/40 transition-all"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Link href="/pricing">
                                        <Sparkles className="h-5 w-5 mr-2" />
                                        Upgrade to Add More
                                    </Link>
                                </Button>

                                {/* Small help text */}
                                <p className="text-xs text-muted-foreground mt-2">
                                    Upgrade to Pro for unlimited subscriptions
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 relative z-10">

                        {/* Main Input - Service Name */}
                        <div className="space-y-3">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Service Name</Label>
                            <div className="relative flex items-center group">
                                <div className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 font-bold text-lg select-none">
                                    {watch("name") ? watch("name").charAt(0).toUpperCase() : <Plus className="h-6 w-6 opacity-50" />}
                                </div>

                                <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={serviceOpen}
                                            className={cn(
                                                "w-full h-16 pl-16 pr-4 text-left justify-start text-lg font-semibold bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/5 transition-all shadow-sm",
                                                errors.name && "border-rose-500 ring-rose-500/20"
                                            )}
                                        >
                                            {watch("name") ? watch("name") : <span className="text-muted-foreground font-normal">e.g. Netflix</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search services..." onValueChange={(val) => {
                                                setValue("name", val, { shouldValidate: true })
                                            }} />
                                            <CommandList>
                                                <CommandEmpty>Custom service "{watch("name")}"</CommandEmpty>
                                                <CommandGroup heading="Popular Services">
                                                    {popularServices.map((service) => (
                                                        <CommandItem
                                                            key={service}
                                                            value={service}
                                                            onSelect={(currentValue) => {
                                                                setValue("name", currentValue, { shouldValidate: true })
                                                                setServiceOpen(false)
                                                            }}
                                                        >
                                                            {service}
                                                            <Check
                                                                className={cn(
                                                                    "ml-auto h-4 w-4",
                                                                    watch("name") === service ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {errors.name && <p className="text-xs font-medium text-rose-500 ml-1">{errors.name.message}</p>}
                        </div>

                        {/* Cost & Cycle Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cost" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Cost</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">
                                        {watch("currency") === "USD" ? "$" : watch("currency") === "EUR" ? "€" : "£"}
                                    </span>
                                    <Input
                                        id="cost"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...register("cost")}
                                        className={cn("h-12 pl-8 text-lg font-medium bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10", errors.cost && "border-rose-500")}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="frequency" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Billing</Label>
                                <Select onValueChange={(val) => setValue("frequency", val, { shouldValidate: true })} defaultValue={subscriptionToEdit?.frequency || "monthly"}>
                                    <SelectTrigger className="h-12 bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 font-medium">
                                        <SelectValue placeholder="Monthly" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Date & Category */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{isTrial ? "Trial Ends" : "Next Payment"}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-12 justify-start text-left font-normal bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10",
                                                !date && "text-muted-foreground",
                                                errors.renewalDate && "border-rose-500"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {date ? format(date, "MMM do, yyyy") : <span>Pick date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={handleDateSelect}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
                                <Select onValueChange={(val) => setValue("category", val)} defaultValue={subscriptionToEdit?.category || "Entertainment"}>
                                    <SelectTrigger className="h-12 bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Sharing Options */}
                        <div className="space-y-2">
                            <Label htmlFor="sharedWithCount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Shared with how many people?</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    id="sharedWithCount"
                                    type="number"
                                    min="1"
                                    {...register("sharedWithCount")}
                                    className={cn("h-12 w-24 text-lg font-medium bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10", errors.sharedWithCount && "border-rose-500")}
                                />
                                <div className="flex-1 text-sm text-muted-foreground transition-all">
                                    {watch("sharedWithCount") && Number(watch("sharedWithCount")) > 1 ? (
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">👤</span>
                                            <span>My Share: {(Number(watch("cost") || 0) / Number(watch("sharedWithCount"))).toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <span className="opacity-50">Personal subscription (100% cost)</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-2 flex items-center justify-between gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="trial" checked={isTrial} onCheckedChange={(checked) => setValue("isTrial", checked === true)} className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                                <Label htmlFor="trial" className="text-sm font-medium cursor-pointer select-none">Free Trial?</Label>
                            </div>

                            <Button type="submit" disabled={loading || !isValid} className="px-8 h-12 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold shadow-lg shadow-zinc-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                {loading ? "Saving..." : subscriptionToEdit ? "Save Changes" : "Add Subscription"}
                            </Button>
                        </div>

                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
