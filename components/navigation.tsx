"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Search, Bell, User, Settings, LogOut, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useProfile } from "@/lib/hooks/use-profile"
import { useNotifications } from "@/lib/hooks/use-notifications"
import { isPro } from "@/lib/subscription-utils"
// import type { Notification } from "@/lib/types" // No longer needed as we use the hook's type or inferred type

// const mockNotifications: Notification[] = [] // Removed

export function Navigation() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { profile } = useProfile()
  const { notifications } = useNotifications()

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    return `${Math.floor(seconds / 86400)} days ago`
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Remind My Bill</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/trust-center">Trust Center</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/analytics">Analytics</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pricing">Pricing</Link>
            </Button>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Search Bar */}
            <div className="hidden lg:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search... (Cmd+K)"
                  className="w-64 pl-9 pr-4"
                  onFocus={() => setIsSearchOpen(true)}
                />
                <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>

            {/* Mobile Search */}
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Recent Alerts</h3>
                    <Badge variant="secondary">{notifications.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No new notifications</p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                        >
                          <AlertCircle
                            className={`mt-0.5 h-5 w-5 flex-shrink-0 ${notification.type === "warning"
                              ? "text-yellow-500"
                              : notification.type === "alert"
                                ? "text-destructive"
                                : "text-primary"
                              }`}
                          />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">{getTimeAgo(notification.created_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Button variant="outline" className="w-full bg-transparent" size="sm">
                    View All Notifications
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary relative">
                    <User className="h-5 w-5" />
                    {isPro(profile?.subscription_tier) && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-black">
                        PRO
                      </span>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b pb-4">
                    <Bell className="h-6 w-6 text-primary" />
                    <span className="text-lg font-bold">Remind My Bill</span>
                  </div>
                  <nav className="flex flex-col gap-2">
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="/trust-center">Trust Center</Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="/analytics">Analytics</Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="/pricing">Pricing</Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="/settings">Settings</Link>
                    </Button>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="/profile">Profile</Link>
                    </Button>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
