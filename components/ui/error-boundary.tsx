"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught component error:", error, errorInfo)
    }

    private handleReset = () => {
        this.setState({ hasError: false })
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <Card className="border-rose-100 bg-rose-50/30 dark:border-rose-900/20 dark:bg-rose-900/10 mb-4">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4 h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-rose-600" />
                        </div>
                        <h3 className="mb-1 text-base font-bold text-rose-900 dark:text-rose-100">Component Error</h3>
                        <p className="mb-4 text-xs text-rose-700 dark:text-rose-300">
                            This widget failed to load.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={this.handleReset}
                            className="h-8 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900"
                        >
                            <RefreshCcw className="mr-2 h-3 w-3" />
                            Reload Widget
                        </Button>
                    </CardContent>
                </Card>
            )
        }

        return this.props.children
    }
}
