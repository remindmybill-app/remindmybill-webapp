export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
        console.warn("Push notifications not supported");
        return "denied";
    }

    if (Notification.permission === "granted") return "granted";

    if (Notification.permission !== "denied") {
        return await Notification.requestPermission();
    }

    return "denied";
}

export async function subscribeToPushNotifications(userId: string) {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
        throw new Error("Notification permission denied");
    }

    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as any,
    });

    await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId,
            subscription,
            deviceName: navigator.userAgent,
        }),
    });

    return subscription;
}

export async function unsubscribeFromPush(userId: string) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/notifications/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, endpoint: subscription.endpoint }),
        });
    }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
