"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Droplets, TrendingDown, ShieldAlert, Loader2 } from "lucide-react"
import { generatePortfolioInsights } from "@/app/actions/portfolio-ai"
import ReactMarkdown from "react-markdown"

interface DashboardAIWidgetProps {
    subscriptions: any[]
}

export function DashboardAIWidget({ subscriptions }: DashboardAIWidgetProps) {
    const [insights, setInsights] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchInsights = async () => {
            if (subscriptions.length === 0) return

            setIsLoading(true)
            setError(null)
            try {
                const result = await generatePortfolioInsights(subscriptions)
                if (result.success) {
                    setInsights(result.data)
                } else {
                    setError(result.error || "Failed to load insights")
                }
            } catch (err) {
                console.error("[DashboardAIWidget] Silent Failure:", err)
                setInsights(null) // Ensure nothing is shown
            } finally {
                setIsLoading(false)
            }
        }

        fetchInsights()
    }, [subscriptions])

    if (subscriptions.length === 0 || error || (!isLoading && !insights)) return null

    return (
        <Card className="rounded-3xl border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold">AI Portfolio Insights</CardTitle>
                        <CardDescription>Gemini analysis of your subscriptions</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                        <p className="text-sm font-medium animate-pulse">Analyzing your spending patterns...</p>
                    </div>
                ) : insights ? (
                    <Tabs defaultValue="leakage" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 rounded-none bg-transparent border-b border-zinc-100 dark:border-zinc-800 h-12">
                            <TabsTrigger value="leakage" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none gap-2">
                                <Droplets className="h-4 w-4 text-blue-500" /> Leakage
                            </TabsTrigger>
                            <TabsTrigger value="forecast" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none gap-2">
                                <TrendingDown className="h-4 w-4 text-emerald-500" /> Forecast
                            </TabsTrigger>
                            <TabsTrigger value="risks" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none gap-2">
                                <ShieldAlert className="h-4 w-4 text-rose-500" /> Risks
                            </TabsTrigger>
                        </TabsList>
                        <div className="p-6">
                            <TabsContent value="leakage" className="mt-0 focus-visible:ring-0">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{insights.leakage}</ReactMarkdown>
                                </div>
                            </TabsContent>
                            <TabsContent value="forecast" className="mt-0 focus-visible:ring-0">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{insights.forecast}</ReactMarkdown>
                                </div>
                            </TabsContent>
                            <TabsContent value="risks" className="mt-0 focus-visible:ring-0">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{insights.risks}</ReactMarkdown>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : null}
            </CardContent>
        </Card>
    )
}
