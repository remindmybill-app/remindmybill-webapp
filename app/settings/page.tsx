"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Lock, Bell, CreditCard, Smartphone, DollarSign } from "lucide-react"
import { useProfile } from "@/lib/hooks/use-profile"

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [pushAlerts, setPushAlerts] = useState(true)
  const { profile, updateProfile } = useProfile()
  const [currency, setCurrency] = useState(profile?.default_currency || "USD")

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency)
    await updateProfile({ default_currency: newCurrency })
    console.log("[v0] Currency updated to:", newCurrency)
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
        <Tabs defaultValue="account" className="space-y-6">
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
                <CardDescription>Change your password to keep your account secure</CardDescription>
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
                <CardTitle>Gmail Integration</CardTitle>
                <CardDescription>Connect your Gmail account for AI Inbox Hunter</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent">
                  <Mail className="mr-2 h-4 w-4" />
                  Link Gmail Account
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
                <CardDescription>Manage your SubGuard subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-card/50 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">Automated (Pro)</p>
                      <Badge className="bg-primary/20 text-primary">Active</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{currency} 3.99/month, billed monthly</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{currency} 3.99</p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full bg-transparent">
                    Manage Subscription
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>View your past invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { date: "Jan 1, 2025", amount: "3.99", status: "Paid" },
                    { date: "Dec 1, 2024", amount: "3.99", status: "Paid" },
                    { date: "Nov 1, 2024", amount: "3.99", status: "Paid" },
                  ].map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{invoice.date}</p>
                        <p className="text-sm text-muted-foreground">
                          {currency} {invoice.amount}
                        </p>
                      </div>
                      <Badge className="bg-primary/20 text-primary">{invoice.status}</Badge>
                    </div>
                  ))}
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
    </div>
  )
}
