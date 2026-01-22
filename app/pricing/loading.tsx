
import { Skeleton } from "@/components/ui/skeleton"

export default function PricingLoading() {
    return (
        <div className="min-h-screen bg-background py-12">
            <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 space-y-12">

                <div className="text-center space-y-4">
                    <Skeleton className="h-12 w-[400px] mx-auto" />
                    <Skeleton className="h-6 w-[300px] mx-auto" />
                </div>

                <div className="flex justify-center">
                    <Skeleton className="h-8 w-[200px] rounded-full" />
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    <Skeleton className="h-[600px] w-full rounded-xl" />
                    <Skeleton className="h-[600px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
