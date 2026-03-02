"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { SubscriptionsProvider } from "@/lib/contexts/subscriptions-context"
import { SubscriptionReviewModal } from "@/components/subscription-review-modal"
import { useProfile } from "@/lib/hooks/use-profile"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"

function NavigationGuard({ children }: { children: React.ReactNode }) {
    const { profile, updateProfile } = useProfile()
    const { subscriptions } = useSubscriptions()
    const pathname = usePathname()

    const needsReview = profile?.needs_subscription_review === true
    const isFreeTier = profile?.user_tier === 'free' || profile?.subscription_tier === 'free'
    const activeCount = subscriptions.filter(s => s.is_enabled).length

    // TRIGGER B: Real-time client detection
    useEffect(() => {
        if (isFreeTier && activeCount > 5 && !needsReview) {
            updateProfile({ needs_subscription_review: true })
        }
    }, [isFreeTier, activeCount, needsReview, updateProfile])

    // BUG 2: Block navigation while modal is active
    useEffect(() => {
        if (needsReview && pathname !== '/pricing') {
            // Block back button / history navigation
            const handlePopState = () => {
                window.history.pushState(null, '', window.location.href)
            }

            window.history.pushState(null, '', window.location.href)
            window.addEventListener('popstate', handlePopState)

            // Block clicks on all links except pricing
            const handleLinkClick = (e: MouseEvent) => {
                const target = e.target as HTMLElement
                const link = target.closest('a')
                if (link && link.href) {
                    const url = new URL(link.href)
                    if (url.origin === window.location.origin && url.pathname !== '/pricing') {
                        e.preventDefault()
                        e.stopPropagation()
                    }
                }
            }

            window.addEventListener('click', handleLinkClick, true)

            return () => {
                window.removeEventListener('popstate', handlePopState)
                window.removeEventListener('click', handleLinkClick, true)
            }
        }
    }, [needsReview, pathname])

    return <>{children}</>
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SubscriptionsProvider>
            <NavigationGuard>
                {children}
                <SubscriptionReviewModal />
            </NavigationGuard>
        </SubscriptionsProvider>
    )
}
