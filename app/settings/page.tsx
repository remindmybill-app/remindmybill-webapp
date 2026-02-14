"use client"

import { useState, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Lock, Bell, CreditCard, Smartphone, DollarSign, AlertTriangle } from "lucide-react"
import { useProfile } from "@/lib/hooks/use-profile"
import { useSubscriptions } from "@/lib/hooks/use-subscriptions"
import { DowngradeConfirmationDialog } from "@/components/downgrade-confirmation-dialog"
import { isPro, isFree, getTierDisplayName, getTierLimit } from "@/lib/subscription-utils"
import { downgradeUserToFree } from "@/app/actions/mock-upgrade"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"

function SettingsContent() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [pushAlerts, setPushAlerts] = useState(true)
  const { profile, updateProfile, mutate } = useProfile()
  const { subscriptions, refreshSubscriptions } = useSubscriptions()
  const [currency, setCurrency] = useState(profile?.default_currency || "USD")

  // Downgrade State
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') || 'account'

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
                  <Input id="email" type="email" defaultValue={profile?.email || ""} readOnly />
                </div>
                <Button>Update Email</Button>
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
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button>Change Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Gmail Integration
                  {!isPro(profile?.subscription_tier) && <Badge variant="secondary" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">PRO</Badge>}
                </CardTitle>
                <CardDescription>Connect your Gmail account for AI Inbox Hunter</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={isPro(profile?.subscription_tier) ? handleConnectGmail : () => router.push('/pricing')}
                >
                  {isPro(profile?.subscription_tier) ? (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Link Gmail Account
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4 text-amber-500" />
                      Upgrade to Link Gmail
                    </>
                  )}
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  We'll scan your inbox for subscription confirmations and hidden charges. Your emails remain private
                  and encrypted.
                </p>
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
                      {profile?.sms_addon_enabled && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                          <Smartphone className="h-3 w-3 mr-1" />SMS
                        </Badge>
                      )}
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
                  {isPro(profile?.user_tier || profile?.subscription_tier) && profile?.user_tier !== 'lifetime' && (
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowDowngradeDialog(true)}
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
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sms-alerts" className="text-base">
                        SMS Alerts
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        Pro
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Get text messages for urgent renewals</p>
                  </div>
                  <Switch id="sms-alerts" checked={smsAlerts} onCheckedChange={setSmsAlerts} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-alerts" className="text-base">
                      Push Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">Browser notifications for real-time alerts</p>
                  </div>
                  <Switch id="push-alerts" checked={pushAlerts} onCheckedChange={setPushAlerts} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  SMS Phone Number
                </CardTitle>
                <CardDescription>Add your phone number to receive SMS alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
                </div>
                <Button>Save Phone Number</Button>
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
