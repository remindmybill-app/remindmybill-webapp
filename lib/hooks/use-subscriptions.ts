"use client"

import { useSubscriptionsContext } from "@/lib/contexts/subscriptions-context"

export function useSubscriptions() {
  const context = useSubscriptionsContext()
  return context
}
