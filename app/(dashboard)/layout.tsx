import { SubscriptionsProvider } from "@/lib/contexts/subscriptions-context"
import { SubscriptionReviewModal } from "@/components/subscription-review-modal"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SubscriptionsProvider>
            {children}
            <SubscriptionReviewModal />
        </SubscriptionsProvider>
    )
}
