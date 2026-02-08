"use client"

import { SubscriptionsProvider } from "@/lib/contexts/subscriptions-context"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SubscriptionsProvider>
            {children}
        </SubscriptionsProvider>
    )
}
