'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

interface UserFiltersProps {
    currentSearch?: string;
    currentTier?: string;
}

export default function UserFilters({
    currentSearch,
    currentTier,
}: UserFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    function updateParams(key: string, value: string) {
        const params = new URLSearchParams();
        if (key === 'search') {
            if (value) params.set('search', value);
            if (currentTier && currentTier !== 'all') params.set('tier', currentTier);
        } else if (key === 'tier') {
            if (currentSearch) params.set('search', currentSearch);
            if (value && value !== 'all') params.set('tier', value);
        }

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <input
                type="text"
                placeholder="Search by name or email…"
                defaultValue={currentSearch || ''}
                onChange={(e) => updateParams('search', e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600 w-full sm:w-80"
            />
            <select
                defaultValue={currentTier || 'all'}
                onChange={(e) => updateParams('tier', e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
            >
                <option value="all">All Tiers</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="lifetime">Lifetime</option>
            </select>
            {isPending && (
                <span className="text-gray-500 text-sm self-center">Loading…</span>
            )}
        </div>
    );
}
