import type { Metadata } from 'next';
import AdminNavLink from './_components/AdminNavLink';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    ShieldCheck,
    MessageSquare,
    TrendingDown,
    Timer,
} from 'lucide-react';

export const metadata: Metadata = {
    robots: 'noindex, nofollow',
};

const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/billing', label: 'Billing', icon: CreditCard },
    { href: '/admin/trust-center', label: 'Trust Center', icon: ShieldCheck },
    { href: '/admin/support', label: 'Support', icon: MessageSquare },
    { href: '/admin/cancellations', label: 'Cancellations', icon: TrendingDown },
    { href: '/admin/cron', label: 'Cron Jobs', icon: Timer },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-950">
            {/* LEFT SIDEBAR */}
            <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
                {/* Header */}
                <div className="px-5 py-5 border-b border-gray-800">
                    <h1 className="text-white font-bold text-lg">🔐 RMMB Admin</h1>
                    <p className="text-xs text-gray-600 mt-0.5">
                        Internal — Do Not Share
                    </p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <AdminNavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                        />
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-800">
                    <p className="text-xs text-gray-600">RemindMyBill © 2025</p>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-auto bg-gray-950">{children}</main>
        </div>
    );
}
