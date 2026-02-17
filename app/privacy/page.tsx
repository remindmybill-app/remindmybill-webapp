export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
            <div className="prose prose-invert">
                <p className="text-gray-300 mb-4">
                    Last updated: February 17, 2026
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">
                    Information We Collect
                </h2>
                <p className="text-gray-300 mb-4">
                    We collect information you provide directly to us, including your email address,
                    subscription data, and payment information (processed securely via Stripe).
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">
                    How We Use Your Information
                </h2>
                <p className="text-gray-300 mb-4">
                    We use your information to provide subscription tracking services, send email
                    alerts, and improve our platform.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">
                    Contact Us
                </h2>
                <p className="text-gray-300">
                    If you have questions about this Privacy Policy, please contact us at{' '}
                    <a href="/contact" className="text-blue-400 hover:text-blue-300">
                        our contact page
                    </a>.
                </p>
            </div>
        </div>
    );
}
