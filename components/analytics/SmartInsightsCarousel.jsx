"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Rocket, TrendingUp, Lightbulb, AlertTriangle, ArrowRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { getNextRenewalDate } from "@/lib/utils/date-utils"

export function SmartInsightsCarousel({ subscriptions, velocity, categoryData, userCurrency = "USD" }) {
    const insights = React.useMemo(() => {
        const cards = []

        // 1. Velocity Alert
        if (velocity && velocity.current > velocity.last * 1.10) {
            const increasePercent = Math.round(((velocity.current - velocity.last) / velocity.last) * 100)
            cards.push({
                type: 'velocity',
                title: 'Spending Velocity',
                message: `You're spending ${increasePercent}% faster than last month`,
                action: 'View Details',
                icon: Rocket,
                color: 'bg-blue-500',
                textColor: 'text-blue-600',
                bgColor: 'bg-blue-50 dark:bg-blue-500/10'
            })
        }

        // 2. Category Drift (Best candidate: largest meaningful % increase)
        if (categoryData && categoryData.length > 0) {
            const drifter = categoryData
                .filter(cat => cat.previousValue > 10 && cat.value > cat.previousValue * 1.2) // >10 min spend, >20% increase
                .sort((a, b) => {
                    const aDelta = (a.value - a.previousValue) / a.previousValue
                    const bDelta = (b.value - b.previousValue) / b.previousValue
                    return bDelta - aDelta
                })[0]

            if (drifter) {
                const delta = Math.round(((drifter.value - drifter.previousValue) / drifter.previousValue) * 100)
                cards.push({
                    type: 'category',
                    title: 'Category Alert',
                    message: `${drifter.name} is up ${delta}% this month`,
                    action: 'Review Breakdown',
                    icon: TrendingUp,
                    color: 'bg-orange-500',
                    textColor: 'text-orange-600',
                    bgColor: 'bg-orange-50 dark:bg-orange-500/10'
                })
            }
        }

        // 3. Savings Opportunity (Unused subs)
        // Check for subscriptions with last_used_date > 30 days ago
        const now = new Date()
        const unusedSubs = subscriptions.filter(sub => {
            if (sub.status !== 'active') return false
            if (!sub.last_used_date) return false
            const lastUsed = new Date(sub.last_used_date)
            const daysSince = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)
            return daysSince > 30
        })

        if (unusedSubs.length > 0) {
            const potentialSavings = unusedSubs.reduce((sum, sub) => sum + sub.cost, 0)
            cards.push({
                type: 'savings',
                title: `Save ${formatCurrency(potentialSavings, userCurrency)}/mo`,
                message: `Cancel ${unusedSubs.length} unused subscription${unusedSubs.length > 1 ? 's' : ''}`,
                action: 'See Which Ones',
                icon: Lightbulb,
                color: 'bg-emerald-500',
                textColor: 'text-emerald-600',
                bgColor: 'bg-emerald-50 dark:bg-emerald-500/10'
            })
        }

        // 4. Upcoming Spike (Heavy bills in next 7 days)
        const next7Days = new Date()
        next7Days.setDate(now.getDate() + 7)

        const upcomingBills = subscriptions.filter(sub => {
            if (sub.status !== 'active') return false
            const renewalDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
            return renewalDate >= now && renewalDate <= next7Days
        })

        const upcomingTotal = upcomingBills.reduce((sum, sub) => sum + sub.cost, 0)

        // Threshold: e.g., > 10% of monthly spend or > 100 currency units
        // Let's use a flat > 50 threshold for now as a "Heavy Week" wrapper
        if (upcomingTotal > 50) {
            cards.push({
                type: 'spike',
                title: 'Heavy Week Ahead',
                message: `${upcomingBills.length} bills due: ${formatCurrency(upcomingTotal, userCurrency)} total`,
                action: 'View Timeline',
                icon: AlertTriangle,
                color: 'bg-amber-500',
                textColor: 'text-amber-600',
                bgColor: 'bg-amber-50 dark:bg-amber-500/10'
            })
        }

        return cards
    }, [subscriptions, velocity, categoryData, userCurrency])

    if (insights.length === 0) return null

    return (
        <Carousel
            opts={{
                align: "start",
                loop: true,
            }}
            className="w-full"
        >
            <CarouselContent className="-ml-4">
                {insights.map((card, index) => (
                    <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/4">
                        <div className="p-1">
                            <Card className={`border-0 shadow-sm ${card.bgColor} backdrop-blur-sm`}>
                                <CardContent className="flex flex-col gap-3 p-5">
                                    <div className="flex items-start justify-between">
                                        <div className={`p-2 rounded-xl bg-white dark:bg-black/20 shadow-sm ${card.textColor}`}>
                                            <card.icon className="w-5 h-5" />
                                        </div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider ${card.textColor} opacity-80`}>
                                            Insights
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight mb-1">{card.title}</h4>
                                        <p className="text-xs text-muted-foreground font-medium">{card.message}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-bold ${card.textColor} mt-1 cursor-pointer hover:underline`}>
                                        {card.action} <ArrowRight className="w-3 h-3" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            {insights.length > 2 && (
                <>
                    <CarouselPrevious className="hidden md:flex -left-5" />
                    <CarouselNext className="hidden md:flex -right-5" />
                </>
            )}
        </Carousel>
    )
}
