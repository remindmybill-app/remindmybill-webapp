'use client';

import { useState, useTransition } from 'react';
import {
    overrideTier,
    toggleSuspend,
    resendEmail,
} from '@/app/admin/_actions/index';

interface UserActionsProps {
    userId: string;
    user_tier: string;
    isSuspended: boolean;
}

export default function UserActions({
    userId,
    user_tier,
    isSuspended,
}: UserActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<string | null>(null);

    function showMessage(msg: string) {
        setMessage(msg);
        setTimeout(() => setMessage(null), 3000);
    }

    function handleTierChange(tier: string) {
        startTransition(async () => {
            const result = await overrideTier(userId, tier);
            showMessage(result.message);
        });
    }

    function handleToggleSuspend() {
        startTransition(async () => {
            const result = await toggleSuspend(userId, !isSuspended);
            showMessage(result.message);
        });
    }

    function handleResendEmail(type: 'welcome' | 'reminder') {
        startTransition(async () => {
            const result = await resendEmail(userId, type);
            showMessage(result.message);
        });
    }

    const tiers = ['free', 'pro', 'lifetime'] as const;

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Admin Actions</h2>

            {/* TIER OVERRIDE */}
            <div>
                <p className="text-xs text-gray-500 mb-2">Tier Override</p>
                <div className="flex gap-2 flex-wrap">
                    {tiers.map((tier) => (
                        <button
                            key={tier}
                            onClick={() => handleTierChange(tier)}
                            disabled={user_tier === tier || isPending}
                            className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${user_tier === tier
                                ? 'text-blue-400 border-blue-600 bg-blue-950/30 cursor-default'
                                : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                                } disabled:opacity-50`}
                        >
                            {user_tier === tier ? `✓ ${tier}` : tier}
                        </button>
                    ))}
                </div>
            </div>

            {/* OTHER ACTIONS */}
            <div>
                <p className="text-xs text-gray-500 mb-2">Other Actions</p>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handleToggleSuspend}
                        disabled={isPending}
                        className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${isSuspended
                            ? 'text-green-400 border-green-700 hover:bg-green-900/20'
                            : 'text-red-400 border-red-700 hover:bg-red-900/20'
                            } disabled:opacity-50`}
                    >
                        {isSuspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button
                        onClick={() => handleResendEmail('welcome')}
                        disabled={isPending}
                        className="text-sm px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
                    >
                        Resend Welcome Email
                    </button>
                    <button
                        onClick={() => handleResendEmail('reminder')}
                        disabled={isPending}
                        className="text-sm px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
                    >
                        Resend Reminder Email
                    </button>
                </div>
            </div>

            {/* SUCCESS MESSAGE */}
            {message && (
                <div className="text-green-400 bg-green-900/20 rounded-lg px-3 py-2 text-sm">
                    {message}
                </div>
            )}
        </div>
    );
}
