'use client';

import { useState, useTransition } from 'react';
import { retryInvoice } from '@/app/admin/_actions/index';

interface RetryButtonProps {
    invoiceId: string;
}

export default function RetryButton({ invoiceId }: RetryButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<string | null>(null);

    function handleRetry() {
        startTransition(async () => {
            const res = await retryInvoice(invoiceId);
            if (res.success) {
                setResult('✓ Charged');
            } else {
                setResult(`✗ ${res.error || 'Failed'}`);
            }
            setTimeout(() => setResult(null), 4000);
        });
    }

    if (result) {
        return (
            <span
                className={`text-xs ${result.startsWith('✓') ? 'text-green-400' : 'text-red-400'
                    }`}
            >
                {result}
            </span>
        );
    }

    return (
        <button
            onClick={handleRetry}
            disabled={isPending}
            className="text-xs px-3 py-1 rounded-lg border border-blue-700 text-blue-400 hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
        >
            {isPending ? 'Retrying…' : 'Retry'}
        </button>
    );
}
