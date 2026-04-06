"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered successfully. Scope:', reg.scope)
        })
        .catch((err) => {
          console.error('[SW] Registration failed:', err)
        })
    }
  }, [])

  // Render nothing, it's a utility component
  return null
}
