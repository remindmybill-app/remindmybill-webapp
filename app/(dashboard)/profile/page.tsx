"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DollarSign, Activity, CalendarDays, Loader2, ShieldAlert } from "lucide-react"
import { useProfile } from "@/lib/hooks/use-profile"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { toast } from "sonner"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const { profile, isLoading: profileLoading, updateProfile } = useProfile()
  const { subscriptions, isLoading: subsLoading } = useSubscriptions()
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  // Form states
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

  // Password states
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Notification states
  const [emailReminders, setEmailReminders] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [reminderTiming, setReminderTiming] = useState("3")

  // Auth state
  const [authProvider, setAuthProvider] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    async function loadAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAuthProvider(user.app_metadata.provider || null)
      }
    }
    loadAuth()

    if (profile) {
      setFullName(profile.full_name || "")
      setEmail(profile.email || "")
      if (profile.email_reminders_enabled !== undefined) setEmailReminders(profile.email_reminders_enabled)
      if (profile.push_notifications_enabled !== undefined) setPushNotifications(profile.push_notifications_enabled)
      if (profile.reminder_timing !== undefined) setReminderTiming(profile.reminder_timing.toString())
    }
  }, [profile, supabase.auth])

  // Derived stats
  const totalTracked = useMemo(() => {
    // BUG 1 Fix: Sum cost of ALL subscriptions
    return subscriptions.reduce((sum, sub) => sum + Number(sub.cost || 0), 0)
  }, [subscriptions])

  const activeCount = useMemo(() => {
    // BUG 1 Fix: Count only enabled subscriptions
    return subscriptions.filter(s => s.is_enabled === true).length
  }, [subscriptions])

  const daysActive = useMemo(() => {
    if (!profile?.created_at) return 0
    return Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
  }, [profile?.created_at])

  // Helpers
  const getBadgeStyles = (tier?: string) => {
    if (tier === 'lifetime') return "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-500 border-amber-500/30"
    if (tier === 'pro' || tier === 'premium') return "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30"
    return "bg-muted/40 text-muted-foreground border-border"
  }

  const getBadgeText = (tier?: string) => {
    if (tier === 'lifetime') return "Fortress"
    if (tier === 'pro' || tier === 'premium') return "Shield"
    return "Guardian"
  }

  // Handlers
  const [savingDetails, setSavingDetails] = useState(false)
  const handleSaveDetails = async () => {
    setSavingDetails(true)
    try {
      if (email !== profile?.email) {
        const { error } = await supabase.auth.updateUser({ email })
        if (error) throw error
        toast.info("Verification email sent to new address. Please verify to complete the change.")
      }

      if (fullName !== profile?.full_name) {
        await updateProfile({ full_name: fullName })
      }
      toast.success("Account details updated successfully.")
    } catch (error: any) {
      toast.error(error.message || "Failed to save details")
    } finally {
      setSavingDetails(false)
    }
  }

  const [savingPassword, setSavingPassword] = useState(false)
  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      toast.error(err.message || "Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  const [savingNotifs, setSavingNotifs] = useState(false)
  const handleSaveNotifications = async () => {
    setSavingNotifs(true)
    try {
      await updateProfile({
        email_reminders_enabled: emailReminders,
        push_notifications_enabled: pushNotifications,
        reminder_timing: parseInt(reminderTiming, 10)
      })
      toast.success("Notification preferences saved")
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences")
      // Revert states on failure if needed, but since we use the hook profile data on load,
      // a refresh would also revert them. For immediate UI feedback:
      if (profile) {
        setEmailReminders(profile.email_reminders_enabled ?? true)
        setPushNotifications(profile.push_notifications_enabled ?? false)
        setReminderTiming(profile.reminder_timing?.toString() ?? "3")
      }
    } finally {
      setSavingNotifs(false)
    }
  }

  const [deleting, setDeleting] = useState(false)
  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete account")
      }
      toast.success("Account deleted successfully")
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account")
      setDeleting(false)
    }
  }

  if (profileLoading || subsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-10 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">

        {/* SECTION 1: Profile Header */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
            <Avatar className="h-28 w-28 border-4 border-background shadow-md shadow-foreground/5">
              <AvatarFallback className="text-4xl font-bold bg-muted text-muted-foreground">
                {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{profile?.full_name || "User"}</h1>
              <p className="text-lg text-muted-foreground">{profile?.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold uppercase tracking-wider ${getBadgeStyles(profile?.user_tier)}`}>
                  {getBadgeText(profile?.user_tier)}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium text-muted-foreground bg-secondary">
                  Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                </Badge>
              </div>
            </div>
            <Button variant="outline" onClick={() => document.getElementById('edit-details')?.scrollIntoView({ behavior: 'smooth' })}>
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* SECTION 2: Account Stats */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Money Tracked</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalTracked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Days Active</p>
                  <p className="text-2xl font-bold text-foreground">{daysActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">

            {/* SECTION 3: Edit Account Details */}
            <Card id="edit-details" className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground font-semibold">Account Details</CardTitle>
                <CardDescription>Update your personal information and email address.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                  <p className="text-xs text-muted-foreground">Note: Changing email requires re-verification.</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveDetails} disabled={savingDetails}>
                  {savingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>

            {/* SECTION 3 pt 2: Password Change */}
            {authProvider === 'email' ? (
              <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-foreground font-semibold">Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" title="Current Password" className="text-muted-foreground">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" title="New Password" className="text-muted-foreground">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" title="Confirm New Password" className="text-muted-foreground">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSavePassword} disabled={savingPassword || (!currentPassword && !newPassword && !confirmPassword)}>
                    {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-foreground font-semibold">Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted/50 p-4 border border-border">
                    <p className="text-sm text-muted-foreground">
                      You signed in with <span className="font-semibold capitalize">{authProvider || 'Google'}</span>.
                      Password management is handled by your {authProvider || 'Google'} account.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          <div className="space-y-8">

            {/* SECTION 4: Notification Preferences */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground font-semibold">Notifications</CardTitle>
                <CardDescription>Manage how we notify you about your bills.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Email Reminders</Label>
                    <p className="text-sm text-muted-foreground">Receive upcoming bill alerts via email.</p>
                  </div>
                  <Switch checked={emailReminders} onCheckedChange={setEmailReminders} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts on your device (PWA).</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Reminder Timing</Label>
                  <p className="text-sm text-muted-foreground mb-2">When should we remind you before a bill is due?</p>
                  <Select value={reminderTiming} onValueChange={setReminderTiming}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day before</SelectItem>
                      <SelectItem value="3">3 days before</SelectItem>
                      <SelectItem value="7">7 days before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveNotifications} disabled={savingNotifs} variant="secondary" className="w-full">
                  {savingNotifs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>

            {/* SECTION 5: Danger Zone */}
            <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  Permanently remove your account and all associated data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full font-semibold">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your data and cancel your subscription. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}>
                        {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete My Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
