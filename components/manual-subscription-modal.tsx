
"use client"

import { useState } from "react"
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
import { CalendarIcon, Plus, Check } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

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

export function ManualSubscriptionModal({ onSubscriptionAdded }: { onSubscriptionAdded: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState<Date>()
    const [serviceOpen, setServiceOpen] = useState(false)

    const { register, handleSubmit, setValue, watch, reset, formState: { errors, isValid, isDirty } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
        defaultValues: {
            currency: "USD",
            frequency: "monthly",
            isTrial: false,
            category: "Entertainment",
        }
    })

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

            console.log("Attempting to insert subscription for user:", user.id)

            const { error } = await supabase.from('subscriptions').insert({
                user_id: user.id,
                name: values.name,
                cost: Number(values.cost),
                currency: values.currency,
                frequency: values.frequency,
                renewal_date: values.renewalDate.toISOString(),
                status: values.isTrial ? "active" : "active", // Defaulting to active as requested
                category: values.category,
                trust_score: 50,
            })

            if (error) {
                console.error("Supabase insert error:", error)
                throw new Error(error.message || "Database insert failed")
            }

            toast.success("Subscription added successfully")
            setOpen(false)
            reset()
            setDate(undefined)
            onSubscriptionAdded()
        } catch (error: any) {
            console.error("Error adding subscription:", error)
            toast.error(error.message || "Check your internet or database connection")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    Add Manually
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Subscription</DialogTitle>
                    <DialogDescription>
                        All fields marked with * are mandatory.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">

                    <div className="grid gap-2">
                        <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>Service Name *</Label>
                        <div className="relative">
                            <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={serviceOpen}
                                        className={cn(
                                            "w-full justify-between",
                                            errors.name && "border-destructive focus-visible:ring-destructive"
                                        )}
                                    >
                                        {watch("name") ? watch("name") : "Select or type service..."}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search service..." className="h-9" onValueChange={(val) => {
                                            setValue("name", val, { shouldValidate: true })
                                        }} />
                                        <CommandList>
                                            <CommandEmpty>Type to add custom service.</CommandEmpty>
                                            <CommandGroup>
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
                        {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cost" className={errors.cost ? "text-destructive" : ""}>Cost *</Label>
                            <div className="relative">
                                <Input
                                    id="cost"
                                    type="number"
                                    step="0.01"
                                    placeholder="9.99"
                                    {...register("cost")}
                                    className={cn(
                                        "pl-8",
                                        errors.cost && "border-destructive focus-visible:ring-destructive"
                                    )}
                                />
                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                                    {watch("currency") === "USD" ? "$" : watch("currency") === "EUR" ? "€" : "£"}
                                </span>
                            </div>
                            {errors.cost && <p className="text-xs font-medium text-destructive">{errors.cost.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="currency">Currency *</Label>
                            <Select onValueChange={(val) => setValue("currency", val, { shouldValidate: true })} defaultValue="USD">
                                <SelectTrigger className={errors.currency ? "border-destructive" : ""}>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.currency && <p className="text-xs font-medium text-destructive">{errors.currency.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="frequency">Billing Cycle *</Label>
                            <Select onValueChange={(val) => setValue("frequency", val, { shouldValidate: true })} defaultValue="monthly">
                                <SelectTrigger className={errors.frequency ? "border-destructive" : ""}>
                                    <SelectValue placeholder="Select cycle" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.frequency && <p className="text-xs font-medium text-destructive">{errors.frequency.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select onValueChange={(val) => setValue("category", val)} defaultValue="Entertainment">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className={errors.renewalDate ? "text-destructive" : ""}>{isTrial ? "Trial End Date *" : "Next Renewal Date *"}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground",
                                        errors.renewalDate && "border-destructive focus-visible:ring-destructive"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {errors.renewalDate && <p className="text-xs font-medium text-destructive">{errors.renewalDate.message}</p>}
                    </div>

                    <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/20">
                        <Checkbox id="trial" onCheckedChange={(checked) => setValue("isTrial", checked === true)} />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="trial" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Is this a free trial?
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                We'll treat the renewal date as the trial expiration.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !isValid} className="w-full">
                            {loading ? "Adding Subscription..." : "Add Subscription"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
