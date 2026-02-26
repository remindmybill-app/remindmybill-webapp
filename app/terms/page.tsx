export default function TermsPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-foreground mb-8">Terms & Conditions</h1>
            <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                    Last updated: February 17, 2026
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                    Acceptance of Terms
                </h2>
                <p className="text-muted-foreground mb-4">
                    By accessing RemindMyBill, you agree to these Terms & Conditions.
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                    Subscription Services
                </h2>
                <p className="text-muted-foreground mb-4">
                    We offer Free, Pro, and Lifetime subscription tiers. Payment is processed via Stripe.
                    You may cancel your subscription at any time and retain access until the end of your billing period.
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                    Refund Policy
                </h2>
                <p className="text-muted-foreground mb-4">
                    Subscriptions are non-refundable. When you cancel, you retain access until the end of your paid period.
                </p>
            </div>
        </div>
    );
}
