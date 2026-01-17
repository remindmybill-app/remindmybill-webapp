
"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tv, Music, Code, Dumbbell, Cloud, Mail, Package, Gamepad2, Inbox, Sparkles, TrendingUp, Calendar, MoreHorizontal, Pencil, Trash2, Loader2, Zap, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { formatCurrency } from "@/lib/utils/currency"
import { formatDistanceToNow, parseISO, isPast, addMonths, addYears } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ManualSubscriptionModal } from "@/components/manual-subscription-modal"
import { toast } from "sonner"
import { Subscription } from "@/lib/types"

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
  const { subscriptions, isLoading, refreshSubscriptions, deleteSubscription, cancelSubscription } = useSubscriptions()
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setDeletingId(id)
      const success = await deleteSubscription(id)
      if (success) {
        toast.success("Subscription deleted")
      } else {
        toast.error("Failed to delete subscription")
      }
      setDeletingId(null)
    }
  }

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-emerald-500 dark:text-emerald-400"
    if (score >= 60) return "text-amber-500 dark:text-amber-400"
    return "text-rose-500 dark:text-rose-400"
  }

  const getRenewalText = (dateStr: string, frequency: string) => {
    try {
      let date = parseISO(dateStr)
      if (isPast(date)) {
        const today = new Date()
        while (isPast(date)) {
          if (frequency === 'yearly') date = addYears(date, 1)
          else date = addMonths(date, 1)
        }
      }
      return `${formatDistanceToNow(date)}`
    } catch (e) {
      return "N/A"
    }
  }

  if (!isLoading && subscriptions.length === 0) {
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
            <Button size="lg" className="h-12 rounded-xl bg-zinc-900 px-8 text-md font-bold dark:bg-indigo-600 dark:hover:bg-indigo-700">
              <Sparkles className="h-5 w-5 mr-2" />
              Analyze Inbox
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
        <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
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
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/20 text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="p-6 text-left">Service</th>
                      <th className="p-6 text-right">Price</th>
                      <th className="p-6 text-right">Billing</th>
                      <th className="p-6 text-right">Next Renewal</th>
                      <th className="p-6 text-right">Status</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    {subscriptions.map((sub) => {
                      const Icon = categoryIcons[sub.category] || Package
                      return (
                        <tr key={sub.id} className="group transition-all hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-default">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 group-hover:ring-indigo-500/30 transition-all dark:bg-zinc-800 dark:ring-zinc-700">
                                <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                              </div>
                              <div>
                                <span className="block text-md font-bold text-zinc-900 dark:text-zinc-50">{sub.name}</span>
                                <span className="text-[11px] font-medium text-muted-foreground uppercase">{sub.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-6 text-right">
                            <div className="font-black text-lg tracking-tighter text-zinc-900 dark:text-zinc-50">{formatCurrency(sub.cost, sub.currency)}</div>
                          </td>
                          <td className="p-6 text-right">
                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{sub.frequency || 'Monthly'}</div>
                          </td>
                          <td className="p-6 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-300">{getRenewalText(sub.renewal_date, sub.frequency)}</span>
                            </div>
                          </td>
                          <td className="p-6 text-right">
                            <Badge variant="outline" className="h-6 text-[10px] font-black uppercase tracking-widest bg-emerald-50/50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50">
                              {sub.status || 'Active'}
                            </Badge>
                          </td>
                          <td className="p-6 text-right">
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
                                <DropdownMenuItem onClick={() => setEditingSubscription(sub)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  if (confirm("Are you sure you want to cancel this subscription? It will be marked as cancelled but remain in your history.")) {
                                    cancelSubscription(sub.id)
                                  }
                                }}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Subscription
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(sub.id, sub.name)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 p-4 md:hidden">
                {subscriptions.map((sub) => {
                  const Icon = categoryIcons[sub.category] || Package
                  return (
                    <div key={sub.id} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 ring-1 ring-zinc-100 dark:ring-zinc-700">
                            <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{sub.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground">Renews in {getRenewalText(sub.renewal_date, sub.frequency)}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingSubscription(sub)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(sub.id, sub.name)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
                        <div>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Cost</p>
                          <p className="text-lg font-black tracking-tighter text-zinc-900 dark:text-white">
                            {formatCurrency(sub.cost, sub.currency)}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1 uppercase">/{sub.frequency === 'yearly' ? 'yr' : 'mo'}</span>
                          </p>
                        </div>
                        <Badge variant="outline" className="h-6 text-[10px] font-black uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-800">
                          {sub.category}
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

      {/* Editing Modal */}
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
