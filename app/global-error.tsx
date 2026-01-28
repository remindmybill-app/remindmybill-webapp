"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCcw } from "lucide-react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="en" className="dark">
            <body className="bg-black text-white antialiased">
                <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
                    <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-rose-500/10 shadow-2xl shadow-rose-500/20">
                        <AlertTriangle className="h-12 w-12 text-rose-500" />
                    </div>

                    <h1 className="mb-3 text-4xl font-extrabold tracking-tight">Critical Error Encountered</h1>
                    <p className="mb-10 max-w-md text-xl text-zinc-400">
                        A fatal system error occurred. We're unable to load the application at this time.
                    </p>

                    <Button
                        variant="default"
                        size="lg"
                        className="rounded-2xl gap-3 h-14 px-10 bg-rose-600 hover:bg-rose-700 text-lg font-bold"
                        onClick={() => reset()}
                    >
                        <RefreshCcw className="h-5 w-5" />
                        Restart Application
                    </Button>

                    {error.digest && (
                        <p className="mt-12 text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
                            System Digest: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    )
}
