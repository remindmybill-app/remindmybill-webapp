'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

interface AdminNavLinkProps {
    href: string;
    label: string;
    icon: LucideIcon;
}

export default function AdminNavLink({ href, label, icon: Icon }: AdminNavLinkProps) {
    const pathname = usePathname();

    const isActive =
        pathname === href || (href !== '/admin' && pathname.startsWith(href));

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
        >
            <Icon size={18} />
            {label}
        </Link>
    );
}
