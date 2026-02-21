'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavLinkProps {
    href: string;
    label: string;
    icon: React.ReactNode;
}

export default function AdminNavLink({ href, label, icon }: AdminNavLinkProps) {
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
            {icon}
            {label}
        </Link>
    );
}
