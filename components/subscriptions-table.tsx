"use client"
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tv, Music, Code, Dumbbell, Cloud, Mail, Package, Gamepad2, Inbox, Sparkles, TrendingUp, Calendar, MoreHorizontal, Pencil, Trash2, Loader2, Zap, XCircle, ChevronRight, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { useProfile } from "@/lib/hooks/use-profile"
import { isPro } from "@/lib/subscription-utils"
import { formatCurrency } from "@/lib/utils/currency"
import { formatDistanceToNow, parseISO } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ManualSubscriptionModal } from "@/components/manual-subscription-modal"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Subscription } from "@/lib/types"
import { getNextRenewalDate, getRenewalDisplay } from "@/lib/utils/date-utils"
import { CalendarExportButton } from "@/components/calendar-export-button"

const categoryIcons: Record<string, any> = {
  Entertainment: Tv,
  Music: Music,
  Utility: Zap,
  "Software": Code,
  "Gym/Fitness": Dumbbell,
  "Other": Package,
  "Cloud Services": Cloud,
  "Food/Drink": Zap,
  Gaming: Gamepad2,
}

export function SubscriptionsTable() {
  const { subscriptions, isLoading, refreshSubscriptions, deleteSubscription, cancelSubscription, toggleSubscription } = useSubscriptions()
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedMobileSub, setSelectedMobileSub] = useState<Subscription | null>(null)
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<{ id: string, name: string } | null>(null)
  const [confirmCancelSub, setConfirmCancelSub] = useState<{ id: string, name: string } | null>(null)
  const router = useRouter()

  const { profile } = useProfile();
  const isProStatus = isPro(profile?.subscription_tier, profile?.is_pro);

  const handleToggleEnable = async (sub: Subscription) => {
    if (!sub.is_enabled && !isProStatus) {
      // Check limit for Guardian tier
      const activeCount = subscriptions.filter(s => s.is_enabled !== false && s.status !== 'cancelled').length;
      if (activeCount >= 5) {
        toast.error("Upgrade to Shield to activate more subscriptions");
        return;
      }
    }
    const success = await toggleSubscription(sub.id, !sub.is_enabled);
    if (success) {
      toast.success(`Subscription ${!sub.is_enabled ? 'enabled' : 'disabled'}`);
      router.refresh();
      if (selectedMobileSub?.id === sub.id) {
        setSelectedMobileSub({ ...selectedMobileSub, is_enabled: !sub.is_enabled });
      }
    } else {
      toast.error(`Failed to ${!sub.is_enabled ? 'enable' : 'disable'} subscription`);
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const success = await deleteSubscription(id)
    if (success) {
      toast.success("Subscription deleted")
      router.refresh()
    } else {
      toast.error("Failed to delete subscription")
    }
    setDeletingId(null)
    setSelectedMobileSub(null)
    setConfirmDeleteSub(null)
  }

  const handleCancel = async (id: string) => {
    const success = await cancelSubscription(id)
    if (success) {
      toast.success("Subscription cancelled")
      router.refresh()
    } else {
      toast.error("Failed to cancel subscription")
    }
    setConfirmCancelSub(null)
  }

  if (!isLoading && subscriptions.length === 0) {
    // ... (existing empty state code) ...
    return (
      <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <CardHeader className="p-8">
          <CardTitle className="text-xl font-bold">Active Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800 p-8 ring-1 ring-zinc-200 dark:ring-zinc-700">
              <Inbox className="h-14 w-14 text-zinc-400" />
            </div>
            <h3 className="mb-2 text-xl font-heavy">No assets tracked</h3>
            <p className="mb-8 max-w-sm text-sm text-muted-foreground text-balance">
              Link your primary inbox to automatically visualize and manage your monthly recurring expenditures.
            </p>

            {/* Desktop Analyze Button */}
            <Button size="lg" className="hidden md:flex h-12 rounded-xl bg-zinc-900 px-8 text-md font-bold dark:bg-indigo-600 dark:hover:bg-indigo-700">
              <Sparkles className="h-5 w-5 mr-2" />
              Analyze Inbox
            </Button>

            {/* Mobile Sticky Analyze Button */}
            <div className="md:hidden fixed bottom-20 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 animate-pulse transition duration-1000"></div>
                <Button size="lg" className="relative w-full h-14 rounded-2xl bg-zinc-900 text-lg font-bold shadow-2xl dark:bg-indigo-600 dark:hover:bg-indigo-700 border border-white/10 active:scale-95 transition-transform">
                  <Sparkles className="h-6 w-6 mr-3 text-indigo-400 animate-pulse" />
                  Scan Gmail For Bills
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold leading-none">Portfolio</CardTitle>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">Management Panel</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-widest text-indigo-600" onClick={refreshSubscriptions}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between space-x-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-6 w-[60px] rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4 pl-6 text-left">Service</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-right">Billing</th>
                      <th className="p-4 text-right">Next Renewal</th>
                      <th className="p-4 text-right">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {subscriptions.map((sub, index) => {
                      const Icon = categoryIcons[sub.category] || Package
                      const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
                      const { label, statusColor } = getRenewalDisplay(nextDate)
                      const logoUrl = `https://logo.clearbit.com/${sub.name.toLowerCase().replace(/\s+/g, '')}.com`

                      const isPaused = sub.is_enabled === false
                      const pausedClass = isPaused ? "opacity-50 grayscale" : ""

                      return (
                        <tr key={sub.id} className={`group transition-all hover:bg-muted/50 ${isPaused ? 'bg-muted/30' : ''}`}>
                          <td className={`p-4 pl-6 ${pausedClass}`}>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border group-hover:ring-primary/30 transition-all overflow-hidden relative">
                                <Icon className="h-5 w-5 text-muted-foreground absolute" />
                                <img
                                  src={logoUrl}
                                  alt={sub.name}
                                  className="h-full w-full object-cover relative z-10 bg-background"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.opacity = '0';
                                  }}
                                />
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-foreground flex items-center gap-2">
                                  {sub.name}
                                  {isPaused && <Lock className="h-3 w-3 text-muted-foreground" />}
                                </span>
                                {sub.shared_with_count > 1 && !isPaused && (
                                  <span className="block mt-0.5 text-[9px] font-black uppercase tracking-tighter text-indigo-600 dark:text-indigo-400">
                                    👥 Shared
                                  </span>
                                )}
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">{sub.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className={`p-4 text-right ${pausedClass}`}>
                            <div className="font-black text-sm tracking-tighter text-foreground">
                              {sub.shared_with_count > 1 ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(sub.cost / sub.shared_with_count, sub.currency)}</span>
                                  <span className="text-[9px] text-muted-foreground opacity-50 font-medium">Full: {formatCurrency(sub.cost, sub.currency)}</span>
                                </div>
                              ) : (
                                formatCurrency(sub.cost, sub.currency)
                              )}
                            </div>
                          </td>
                          <td className={`p-4 text-right ${pausedClass}`}>
                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{sub.frequency || 'Monthly'}</div>
                          </td>
                          <td className={`p-4 text-right ${pausedClass}`}>
                            <div className="inline-flex items-center gap-2 justify-end">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className={`text-sm ${statusColor}`}>
                                {label}
                              </span>
                            </div>
                          </td>
                          <td className={`p-4 text-right ${pausedClass}`}>
                            <Badge variant="outline" className={`h-5 text-[10px] font-black uppercase tracking-widest flex items-center w-fit ml-auto ${isPaused ? 'bg-muted text-muted-foreground border-border' : 'bg-emerald-50/50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50'}`}>
                              {isPaused ? "Paused" : (sub.status || 'Active')}
                            </Badge>
                          </td>
                          <td className="p-4 pr-6 text-right relative">
                            <div className="flex items-center justify-end gap-1">
                              <CalendarExportButton
                                name={sub.name}
                                cost={sub.cost / sub.shared_with_count}
                                currency={sub.currency === 'USD' ? '$' : sub.currency === 'EUR' ? '€' : '£'}
                                renewalDate={sub.renewal_date}
                                frequency={sub.frequency}
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                    {deletingId === sub.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleToggleEnable(sub)}>
                                    {sub.is_enabled === false ? <Zap className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                                    {sub.is_enabled === false ? 'Enable' : 'Disable'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setEditingSubscription(sub)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setConfirmCancelSub({ id: sub.id, name: sub.name })}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Subscription
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setConfirmDeleteSub({ id: sub.id, name: sub.name })} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View with Locked State */}
              <div className="space-y-4 p-4 md:hidden">
                {subscriptions.map((sub, index) => {
                  const Icon = categoryIcons[sub.category] || Package
                  const nextDate = getNextRenewalDate(sub.renewal_date, sub.frequency)
                  const { label, statusColor } = getRenewalDisplay(nextDate)
                  const isPaused = sub.is_enabled === false

                  return (
                    <div
                      key={sub.id}
                      className={`rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 active:scale-[0.97] active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-all duration-200 ${isPaused ? 'opacity-50 grayscale' : ''}`}
                      onClick={() => setSelectedMobileSub(sub)}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 ring-1 ring-zinc-100 dark:ring-zinc-700">
                            <Icon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                              {sub.name}
                              {sub.shared_with_count > 1 && <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 px-1 rounded">👥</span>}
                            </p>
                            <p className={`text-xs font-medium ${statusColor}`}>Renews in {label}</p>
                          </div>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                          <MoreHorizontal className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Cost</p>
                          <p className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white">
                            {formatCurrency(sub.cost / sub.shared_with_count, sub.currency)}
                            <span className="text-xs font-normal text-muted-foreground ml-1 uppercase">/{sub.frequency === 'yearly' ? 'yr' : 'mo'}</span>
                          </p>
                          {sub.shared_with_count > 1 && (
                            <p className="text-[9px] text-muted-foreground font-medium">Full: {formatCurrency(sub.cost, sub.currency)}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`h-7 px-3 text-[10px] font-black uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-800 ${isPaused ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isPaused ? "Paused" : sub.category}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mobile Action Drawer */}
      <Drawer open={!!selectedMobileSub} onOpenChange={(open) => !open && setSelectedMobileSub(null)}>
        <DrawerContent className="p-6">
          <DrawerHeader className="p-0 mb-6">
            <div className="flex items-center gap-4 text-left">
              <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                {selectedMobileSub && categoryIcons[selectedMobileSub.category] ? React.createElement(categoryIcons[selectedMobileSub.category], { className: "h-7 w-7 text-indigo-600" }) : <Package className="h-7 w-7" />}
              </div>
              <div>
                <DrawerTitle className="text-2xl font-bold">{selectedMobileSub?.name}</DrawerTitle>
                <p className="text-muted-foreground">{selectedMobileSub?.category} • {selectedMobileSub?.frequency}</p>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex flex-col gap-3 mb-8">
            <Button
              variant="outline"
              className="h-16 w-full rounded-2xl flex items-center justify-between px-6 border-zinc-200 dark:border-zinc-800 active:scale-[0.98] transition-all"
              onClick={() => {
                if (selectedMobileSub) handleToggleEnable(selectedMobileSub);
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  {selectedMobileSub?.is_enabled === false ? <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" /> : <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                </div>
                <span className="text-base font-bold">{selectedMobileSub?.is_enabled === false ? "Enable" : "Disable"} Subscription</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="h-16 w-full rounded-2xl flex items-center justify-between px-6 border-zinc-200 dark:border-zinc-800 active:scale-[0.98] transition-all"
              onClick={() => {
                setEditingSubscription(selectedMobileSub)
                setSelectedMobileSub(null)
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Pencil className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-base font-bold">Edit Details</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>

            <div className="flex items-center justify-between h-16 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <span className="text-base font-bold">Sync to Calendar</span>
              </div>
              <CalendarExportButton
                name={selectedMobileSub?.name || ''}
                cost={(selectedMobileSub?.cost || 0) / (selectedMobileSub?.shared_with_count || 1)}
                currency={selectedMobileSub?.currency === 'USD' ? '$' : selectedMobileSub?.currency === 'EUR' ? '€' : '£'}
                renewalDate={selectedMobileSub?.renewal_date || ''}
                frequency={selectedMobileSub?.frequency || ''}
              />
            </div>

            <Button
              variant="outline"
              className="h-16 w-full rounded-2xl flex items-center justify-between px-6 border-rose-100 bg-rose-50/30 text-rose-600 dark:bg-rose-500/5 dark:border-rose-900/30 active:scale-[0.98] transition-all"
              onClick={() => {
                if (selectedMobileSub) setConfirmDeleteSub({ id: selectedMobileSub.id, name: selectedMobileSub.name })
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100/50 dark:bg-rose-500/20 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                </div>
                <span className="text-base font-bold">Delete Subscription</span>
              </div>
              <ChevronRight className="h-5 w-5 text-rose-300" />
            </Button>
          </div>

          <DrawerFooter className="p-0">
            <DrawerClose asChild>
              <Button variant="ghost" className="h-14 w-full rounded-2xl text-lg font-bold">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!confirmDeleteSub} onOpenChange={(open) => !open && setConfirmDeleteSub(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDeleteSub?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the subscription from your portfolio and analytics. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteSub && handleDelete(confirmDeleteSub.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmCancelSub} onOpenChange={(open) => !open && setConfirmCancelSub(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {confirmCancelSub?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the subscription as cancelled. It will remain in your history but stop recurring in your projections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep Sub</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCancelSub && handleCancel(confirmCancelSub.id)}
              className="bg-zinc-900 dark:bg-zinc-100 rounded-xl"
            >
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManualSubscriptionModal
        open={!!editingSubscription}
        onOpenChange={(open) => !open && setEditingSubscription(null)}
        subscriptionToEdit={editingSubscription}
        trigger={<span className="hidden" />}
        onSubscriptionAdded={() => {
          setEditingSubscription(null)
          refreshSubscriptions()
        }}
      />
    </>
  )
}
