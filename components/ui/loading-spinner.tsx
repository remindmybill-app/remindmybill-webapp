
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function LoadingSpinner({ className, size = 24 }: { className?: string, size?: number }) {
    return (
        <div className={cn("flex items-center justify-center p-4", className)}>
            <Loader2 className="animate-spin text-primary" size={size} />
        </div>
    )
}
