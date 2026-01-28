"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCcw } from "lucide-react"
import Link from "next/link"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10 shadow-xl shadow-rose-500/10">
                <AlertTriangle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
            </div>

            <h2 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Something went wrong</h2>
            <p className="mb-8 max-w-sm text-lg text-muted-foreground">
                We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button
                    variant="default"
                    size="lg"
                    className="rounded-xl gap-2 h-12 px-8"
                    onClick={() => reset()}
                >
                    <RefreshCcw className="h-4 w-4" />
                    Try Again
                </Button>
                <Button
                    variant="outline"
                    size="lg"
                    className="rounded-xl gap-2 h-12 px-8"
                    asChild
                >
                    <Link href="/dashboard">
                        <Home className="h-4 w-4" />
                        Go to Dashboard
                    </Link>
                </Button>
            </div>

            {error.digest && (
                <p className="mt-8 text-xs font-mono text-zinc-400 uppercase tracking-widest">
                    Error ID: {error.digest}
                </p>
            )}
        </div>
    )
}
