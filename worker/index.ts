/// <reference lib="WebWorker" />
export {};

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event: PushEvent) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/favicon-32x32.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/'
        }
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
      console.error('Error parsing push data:', e);
      // Fallback for simple text push
      event.waitUntil(
        self.registration.showNotification('New Bill Reminder from RMB', {
          body: event.data.text()
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url)
  );
});
