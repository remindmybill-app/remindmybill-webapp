import type { Metadata } from "next"
import Link from "next/link"
import {
  Shield,
  Lock,
  KeyRound,
  Eye,
  Database,
  RefreshCcw,
  Trash2,
  Download,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Security & Privacy — RemindMyBill",
  description:
    "Learn how RemindMyBill protects your data. Read-only Gmail access, AES-256 encryption, and full GDPR compliance.",
}

/* ─────────────── helpers ─────────────── */
const SectionHeading = ({
  children,
  id,
}: {
  children: React.ReactNode
  id?: string
}) => (
  <h2
    id={id}
    className="text-2xl font-bold text-foreground mb-6"
  >
    {children}
  </h2>
)

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl border border-border bg-card p-6 sm:p-8 ${className}`}
  >
    {children}
  </div>
)

/* ─────────────── page ─────────────── */
export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background text-muted-foreground selection:bg-emerald-500/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* ═══════════ HERO ═══════════ */}
        <section className="text-center mb-20">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20">
            <Shield className="h-8 w-8 text-[#22c55e]" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
            Your data is yours. Full&nbsp;stop.
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground mb-10">
            RemindMyBill is built on a simple principle: we only access what we
            need, we never sell your data, and you can revoke access at any time.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-5 py-2 text-sm font-semibold text-[#22c55e]">
              <Eye className="h-4 w-4" />
              Read-only Gmail access
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-5 py-2 text-sm font-semibold text-[#22c55e]">
              <Lock className="h-4 w-4" />
              256-bit encryption
            </span>
          </div>
        </section>

        {/* ═══════════ SECTION 1 — What We Access ═══════════ */}
        <section className="mb-20">
          <SectionHeading id="what-we-access">
            What We Access (and what we don&apos;t)
          </SectionHeading>

          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ✅ What we access */}
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-[#22c55e] mb-4">
                  <CheckCircle2 className="h-5 w-5" />
                  What we access
                </h3>
                <ul className="space-y-3">
                  {[
                    "Email subjects and sender names",
                    "Subscription confirmation emails",
                    "Receipt and billing emails",
                    "Renewal notification emails",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-foreground/80"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#22c55e]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* ❌ What we never access */}
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-red-400 mb-4">
                  <XCircle className="h-5 w-5" />
                  What we never access
                </h3>
                <ul className="space-y-3">
                  {[
                    "Email body content outside of receipts",
                    "Your personal conversations",
                    "Contacts or address book",
                    "Calendar or other Google services",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-foreground/80"
                    >
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Note */}
            <div className="mt-8 rounded-xl border border-border bg-background px-5 py-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Note:</span> We
                request read-only OAuth access. We cannot send emails, delete
                emails, or modify your inbox in any way.
              </p>
            </div>
          </Card>
        </section>

        {/* ═══════════ SECTION 2 — How Your Data Is Protected ═══════════ */}
        <section className="mb-20">
          <SectionHeading id="data-protection">
            How Your Data Is Protected
          </SectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Lock,
                title: "Encrypted at rest",
                desc: "All data stored in Supabase is encrypted at rest using AES-256.",
              },
              {
                icon: Shield,
                title: "Encrypted in transit",
                desc: "All connections use TLS 1.2+ encryption. No data travels unencrypted.",
              },
              {
                icon: Database,
                title: "We never store your emails",
                desc: "We extract subscription data and discard the email. Your inbox stays in Google\u2019s servers.",
              },
              {
                icon: KeyRound,
                title: "OAuth tokens only",
                desc: "We never see your Google password. Access is granted via OAuth 2.0 and you can revoke it from your Google account at any time.",
              },
            ].map((card) => (
              <Card key={card.title}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20">
                  <card.icon className="h-5 w-5 text-[#22c55e]" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {card.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ═══════════ SECTION 3 — Your Rights ═══════════ */}
        <section className="mb-20">
          <SectionHeading id="your-rights">Your Rights</SectionHeading>

          <div className="space-y-4">
            {[
              {
                icon: RefreshCcw,
                title: "Revoke access anytime",
                desc: "Go to Settings → Connected Accounts → Disconnect Google. This immediately removes our access to your Gmail.",
              },
              {
                icon: Trash2,
                title: "Delete your data",
                desc: "Deleting your account permanently removes all your data from our servers within 30 days.",
              },
              {
                icon: Download,
                title: "Data portability",
                desc: "Export all your subscription data at any time from your dashboard.",
              },
            ].map((item) => (
              <Card key={item.title} className="flex items-start gap-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20">
                  <item.icon className="h-5 w-5 text-[#22c55e]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ═══════════ SECTION 4 — GDPR & Privacy ═══════════ */}
        <section className="mb-20">
          <SectionHeading id="gdpr">GDPR &amp; Privacy</SectionHeading>

          <Card>
            <p className="text-sm leading-relaxed text-muted-foreground mb-6">
              RemindMyBill is committed to GDPR compliance. We act as a data
              processor on behalf of our users. We do not sell, rent, or share
              personal data with third parties for marketing purposes. For the
              full details, read our{" "}
              <Link
                href="/privacy"
                className="font-medium text-[#22c55e] hover:underline"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="font-medium text-[#22c55e] hover:underline"
              >
                Terms of Service
              </Link>
              .
            </p>
          </Card>
        </section>

        {/* ═══════════ SECTION 5 — Questions? ═══════════ */}
        <section className="text-center">
          <SectionHeading id="contact">Questions?</SectionHeading>

          <p className="text-sm leading-relaxed text-muted-foreground mb-8 max-w-xl mx-auto">
            Have a question about how we handle your data? We&apos;re
            transparent by default.
          </p>

          <a
            href="mailto:support@remindmybill.com"
            className="inline-flex items-center gap-2 rounded-lg border border-[#22c55e] px-6 py-3 text-sm font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
          >
            <Mail className="h-4 w-4" />
            support@remindmybill.com
          </a>
        </section>
      </div>
    </div>
  )
}
