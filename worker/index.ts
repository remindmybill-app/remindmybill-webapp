/// <reference lib="WebWorker" />
export {};

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'RemindMyBill'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: { url: data.url || '/dashboard' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url || '/dashboard')
  )
})
