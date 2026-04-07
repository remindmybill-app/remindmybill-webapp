"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Lock, Bell, CreditCard, Smartphone, DollarSign, AlertTriangle, Sun, Moon } from "lucide-react"
import { useProfile } from "@/lib/hooks/use-profile"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { DowngradeConfirmationDialog } from "@/components/downgrade-confirmation-dialog"
import CancellationSurveyModal from "@/components/CancellationSurveyModal"
import { isPro, isFree, getTierDisplayName, getTierLimit } from "@/lib/subscription-utils"
import { downgradeUserToFree } from "@/app/actions/mock-upgrade"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { disconnectGmailAccount } from "@/app/actions/gmail"
import { subscribeToPushNotifications } from "@/lib/notifications"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

function getPasswordStrength(password: string): {
  score: number
  label: string
  bgClass: string
  textClass: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', bgClass: 'bg-red-500', textClass: 'text-red-500' }
  if (score <= 2) return { score, label: 'Fair', bgClass: 'bg-orange-500', textClass: 'text-orange-500' }
  if (score <= 3) return { score, label: 'Good', bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' }
  return { score, label: 'Strong', bgClass: 'bg-green-500', textClass: 'text-green-500' }
}

function SettingsContent() {
  const [emailNotifications, setEmailNotifications] = useState(true)

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [authUserEmail, setAuthUserEmail] = useState<string>("")
  const [newEmail, setNewEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const { profile, updateProfile, mutate } = useProfile()
  const { subscriptions, refreshSubscriptions } = useSubscriptions()
  const [currency, setCurrency] = useState(profile?.default_currency || "USD")
  const { theme, setTheme } = useTheme()

  // Downgrade State
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') || 'account'

  const [showDisconnectGmailModal, setShowDisconnectGmailModal] = useState(false)
  const [isDisconnectingGmail, setIsDisconnectingGmail] = useState(false)

  const canUsePush = typeof Notification !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator

  // Load state from DB on mount
  useEffect(() => {
    if (profile?.push_notifications_enabled) {
      setPushEnabled(true)
    }
  }, [profile])

  useEffect(() => {
    async function loadAuthUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setProvider(user?.app_metadata?.provider || null)
        setAuthUserEmail(user?.email || "")
        setNewEmail(user?.email || "")
      }
    }
    loadAuthUser()
  }, [])

  const isGoogleUser = provider === 'google'
  const isEmailUser = provider === 'email'

  async function handleUpdateEmail() {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Confirmation sent to your new email address')
    }
  }

  async function handleUpdatePassword() {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    const supabase = createClient()
    // Re-authenticate first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUserEmail!,
      password: currentPassword
    })
    if (signInError) {
      toast.error('Current password is incorrect')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }


  async function handlePushToggle(checked: boolean) {
    setPushLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in')
        return
      }

      if (checked) {
        // Step 1 — Check browser support
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          toast.error('Push notifications are not supported on this device')
          return
        }

        // Step 2 — Request permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Permission denied — enable notifications in your device settings')
          return
        }

        // Step 3 — Get service worker
        const registration = await navigator.serviceWorker.ready

        // Step 4 — Subscribe with VAPID key
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as any
        })

        // Step 5 — Save to DB
        const { error } = await supabase.from('profiles').update({
          push_notifications_enabled: true,
          push_subscription: JSON.stringify(subscription.toJSON())
        }).eq('id', user.id)

        if (error) throw error

        setPushEnabled(true)
        toast.success('Push notifications enabled')

      } else {
        // Toggle OFF
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) await subscription.unsubscribe()

        await supabase.from('profiles').update({
          push_notifications_enabled: false,
          push_subscription: null
        }).eq('id', user.id)

        setPushEnabled(false)
        toast.success('Push notifications disabled')
      }
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`)
      setPushEnabled(!checked) // revert
    } finally {
      setPushLoading(false)
    }
  }


  const handleDisconnectGmail = async () => {
     setIsDisconnectingGmail(true)
     try {
        await disconnectGmailAccount()
        await mutate()
        toast.success("Gmail disconnected — your subscriptions have been kept")
        setShowDisconnectGmailModal(false)
     } catch (e) {
        toast.error("Failed to disconnect Gmail")
     } finally {
        setIsDisconnectingGmail(false)
     }
  }

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency)
    await updateProfile({ default_currency: newCurrency })
    console.log("[v0] Currency updated to:", newCurrency)
  }

  // Simplified: Soft Downgrade (no data deletion)
  const handleDowngrade = async () => {
    if (!profile) return
    setIsProcessing(true)

    try {
      // Perform the soft downgrade (sets is_pro = false, triggers lock sync)
      await downgradeUserToFree(profile.id)

      // Refresh everything
      await mutate()
      await refreshSubscriptions()

      toast.success("Plan downgraded to Free")
      setShowDowngradeDialog(false)
    } catch (error: any) {
      console.error("Downgrade error:", error)
      toast.error("Failed to downgrade: " + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConnectGmail = async () => {
    try {
      const supabase = createClient()

      console.log("Starting Gmail OAuth flow...")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.readonly',
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (error: any) {
      console.error("Gmail connect error:", error)
      toast.error("Failed to connect Gmail: " + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-balance">Settings</h1>
          <p className="text-lg text-muted-foreground text-balance">Manage your account preferences and subscription</p>
        </div>

        {/* Tabbed Interface */}
        <Tabs defaultValue={activeTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize how Remind My Bill looks on your device</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred interface style</p>
                  </div>
                  <div className="flex items-center gap-2 p-1 bg-muted rounded-lg border">
                    <Button
                      variant={theme === 'light' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`gap-2 ${theme === 'light' ? 'bg-background shadow-sm' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={`gap-2 ${theme === 'dark' ? 'bg-background shadow-sm' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Preferred Currency
                </CardTitle>
                <CardDescription>Choose your default currency for subscription tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger id="currency" className="w-full">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                      <SelectItem value="GBP">🇬🇧 GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">🇨🇦 CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">🇦🇺 AUD - Australian Dollar</SelectItem>
                      <SelectItem value="JPY">🇯🇵 JPY - Japanese Yen</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All subscription costs will be displayed in this currency
                  </p>
                </div>
              </CardContent>

            </Card>

            {isGoogleUser && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Connected with Google</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{authUserEmail}</p>
                  </div>
                  <span className="ml-auto text-xs bg-green-950/50 text-green-500 border border-green-900 px-2.5 py-1 rounded-full">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                  Your account is secured by Google. Password and email changes are managed through your Google account settings.
                </p>
              </div>
            )}

            {isEmailUser && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Email Settings
                    </CardTitle>
                    <CardDescription>Update your email address and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleUpdateEmail}>Update Email</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      Password
                    </CardTitle>
                    <CardDescription>
                      Change your password to keep your account secure <span className="text-primary">(Managed via Supabase Auth)</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      {newPassword.length > 0 && (() => {
                        const strength = getPasswordStrength(newPassword)
                        return (
                          <div className="space-y-1.5 mt-1">
                              <div className="flex gap-1">
                                  {[1, 2, 3, 4].map((i) => (
                                      <div
                                          key={i}
                                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                              i <= Math.ceil(strength.score / 1.25)
                                                  ? strength.bgClass
                                                  : 'bg-muted'
                                          }`}
                                      />
                                  ))}
                              </div>
                              <p className={`text-xs ${strength.textClass}`}>
                                  {strength.label} password
                              </p>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleUpdatePassword}>Update Password</Button>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Connected Accounts
                  {!isPro(profile?.subscription_tier) && <Badge variant="secondary" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">PRO</Badge>}
                </CardTitle>
                <CardDescription>Manage your connected integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-muted/30 gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/20 rounded-xl shrink-0">
                      <Mail className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-bold flex items-center gap-2 text-foreground">
                        Gmail
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {profile?.gmail_linked 
                          ? `Scanning enabled for ${profile?.email}`
                          : "Connect to automatically discover subscriptions in your inbox"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto sm:ml-0 flex-shrink-0">
                    {profile?.gmail_linked ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-xs px-2 py-0.5 rounded-full">Connected</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 text-xs px-2 py-0.5 rounded-full">Not connected</Badge>
                    )}
                    {profile?.gmail_linked ? (
                      <Button variant="outline" size="sm" className="h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setShowDisconnectGmailModal(true)}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl"
                        onClick={isPro(profile?.subscription_tier) ? handleConnectGmail : () => router.push('/pricing')}
                      >
                        {isPro(profile?.subscription_tier) ? "Connect" : <><Lock className="mr-2 h-4 w-4 text-amber-500" />Upgrade</>}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Current Plan
                </CardTitle>
                <CardDescription>Manage your Remind My Bill subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-card/50 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{getTierDisplayName(profile?.user_tier || profile?.subscription_tier)} Plan</p>
                      <Badge className={isPro(profile?.user_tier || profile?.subscription_tier)
                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0"
                        : "bg-primary/20 text-primary"}>
                        Active
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile?.user_tier === 'lifetime'
                        ? "$99 one-time · Lifetime access"
                        : isPro(profile?.user_tier || profile?.subscription_tier)
                          ? profile?.subscription_interval === 'annual'
                            ? `${currency} 39.00/year (${currency} 3.25/mo)`
                            : `${currency} 4.99/month`
                          : "Free forever"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile?.current_usage || 0} / {isPro(profile?.user_tier || profile?.subscription_tier) ? 'Unlimited' : getTierLimit(profile?.user_tier || profile?.subscription_tier)} active subscriptions
                    </p>
                    {isFree(profile?.user_tier || profile?.subscription_tier) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Email alerts: {profile?.email_alerts_used ?? 0}/{profile?.email_alerts_limit ?? 3} used this month
                      </p>
                    )}
                  </div>
                  {isPro(profile?.user_tier || profile?.subscription_tier) && profile?.user_tier !== 'lifetime' && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {currency} {profile?.subscription_interval === 'annual' ? '39' : '4.99'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {profile?.subscription_interval === 'annual' ? 'year' : 'month'}
                      </p>
                    </div>
                  )}
                  {profile?.user_tier === 'lifetime' && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-500">👑</p>
                      <p className="text-xs text-muted-foreground">Lifetime</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {isPro(profile?.user_tier || profile?.subscription_tier) && profile?.stripe_customer_id ? (
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/stripe/portal', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ customerId: profile.stripe_customer_id }),
                          })
                          const data = await res.json()
                          if (data.url) window.location.href = data.url
                          else toast.error('Could not open billing portal')
                        } catch (e) {
                          toast.error('Failed to open billing portal')
                        }
                      }}
                    >
                      Manage Subscription
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <a href="/pricing">
                        {isFree(profile?.user_tier || profile?.subscription_tier) ? 'Upgrade Plan' : 'Change Plan'}
                      </a>
                    </Button>
                  )}
                  {profile?.cancellation_scheduled && (
                    <div className="bg-yellow-50 dark:opacity-100 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                        <h4 className="font-semibold text-yellow-900 dark:text-white">Cancellation Scheduled</h4>
                      </div>
                      <p className="text-yellow-800 dark:text-gray-300 text-sm mb-3">
                        Your subscription will end on{' '}
                        <strong>
                          {profile?.cancellation_date ? new Date(profile.cancellation_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'soon'}
                        </strong>
                      </p>
                      <Button
                        onClick={() => window.location.href = '/reactivate?token=' + profile?.cancel_reactivation_token}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel Cancellation
                      </Button>
                    </div>
                  )}

                  {!profile?.cancellation_scheduled && isPro(profile?.user_tier || profile?.subscription_tier) && profile?.user_tier !== 'lifetime' && (
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowCancelModal(true)}
                      disabled={isProcessing}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose how you want to receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications" className="text-base">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive renewal reminders and insights via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-alerts" className="text-base">
                      Push Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Browser notifications for real-time alerts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="push-alerts"
                      checked={pushEnabled}
                      onCheckedChange={handlePushToggle}
                      disabled={pushLoading}
                    />
                    {pushLoading && <span className="text-xs text-gray-400">Setting up...</span>}
                  </div>
                </div>
              </CardContent>
            </Card>


          </TabsContent>
        </Tabs>
      </div>

      <DowngradeConfirmationDialog
        open={showDowngradeDialog}
        onOpenChange={setShowDowngradeDialog}
        onConfirm={handleDowngrade}
        onCancel={() => setShowDowngradeDialog(false)}
        subscriptionCount={subscriptions.filter(s => s.status === 'active').length}
        isProcessing={isProcessing}
      />

      <CancellationSurveyModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        userTier={profile?.user_tier || 'free'}
        userEmail={profile?.email || ''}
      />

      <Dialog open={showDisconnectGmailModal} onOpenChange={setShowDisconnectGmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Gmail?</DialogTitle>
            <DialogDescription>
              We'll stop scanning your inbox for new subscriptions. Your existing subscriptions will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDisconnectGmailModal(false)} disabled={isDisconnectingGmail}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnectGmail} disabled={isDisconnectingGmail}>
              {isDisconnectingGmail ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
