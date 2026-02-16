"use client";

import { useState, useEffect } from "react";
import { X, Download, Bell } from "lucide-react";
import { subscribeToPushNotifications } from "@/lib/notifications";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWAPrompt({ userId }: { userId: string }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Show prompt after 10 seconds on dashboard
            setTimeout(() => setShowPrompt(true), 10000);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Check if installed
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowPrompt(false);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            // Request push notification permission after install
            try {
                await subscribeToPushNotifications(userId);
            } catch (error) {
                console.error("Failed to subscribe to push notifications:", error);
            }
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    if (!showPrompt || isInstalled) return null;

    return (
        <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-blue-500/50 rounded-lg p-4 mb-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Download className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Install RemindMyBill</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            Get instant push notifications and use RemindMyBill like a native app
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Bell className="w-4 h-4" />
                            <span>Never miss a renewal again</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowPrompt(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <button
                onClick={handleInstall}
                className="mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/25"
            >
                Install App
            </button>
        </div>
    );
}
