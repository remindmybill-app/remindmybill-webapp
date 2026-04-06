// public/sw.js

self.addEventListener('install', function(event) {
  console.log('[SW] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  console.log('[SW] Activated')
  event.waitUntil(clients.claim())
})

self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event.data?.text())
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'RememberMyBills'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/favicon-32x32.png',
    data: { url: data.url || '/dashboard' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked')
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/dashboard')
  )
})
