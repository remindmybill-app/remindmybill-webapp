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

const navItems: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: '/admin', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/users', label: 'Users', icon: <Users size={18} /> },
    { href: '/admin/billing', label: 'Billing', icon: <CreditCard size={18} /> },
    { href: '/admin/trust-center', label: 'Trust Center', icon: <ShieldCheck size={18} /> },
    { href: '/admin/support', label: 'Support', icon: <MessageSquare size={18} /> },
    { href: '/admin/cancellations', label: 'Cancellations', icon: <TrendingDown size={18} /> },
    { href: '/admin/cron', label: 'Cron Jobs', icon: <Timer size={18} /> },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* LEFT SIDEBAR */}
            <aside className="w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
                {/* Header */}
                <div className="px-5 py-5 border-b border-sidebar-border">
                    <h1 className="text-sidebar-foreground font-bold text-lg">🔐 RMMB Admin</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
                <div className="px-5 py-4 border-t border-sidebar-border">
                    <p className="text-xs text-muted-foreground">RemindMyBill © 2025</p>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
    );
}
