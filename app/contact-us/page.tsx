import { Metadata } from 'next';
import PublicContactForm from '@/components/PublicContactForm';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Contact Us | RemindMyBill',
    description: 'Get in touch with RemindMyBill support team'
};

export default function PublicContactPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] py-16 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Get in Touch
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Have a question? We'd love to hear from you.
                    </p>
                </div>

                {/* Login Prompt for Existing Users */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-gray-300">
                            Already a member?{' '}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                                Log in
                            </Link>
                            {' '}for faster support with your account details pre-filled.
                        </p>
                    </div>
                </div>

                {/* Public Contact Form */}
                <PublicContactForm />

                {/* Additional Info */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Other Ways to Reach Us
                    </h3>
                    <div className="space-y-3 text-gray-400">
                        <p>
                            <strong className="text-white">General Inquiries:</strong>{' '}
                            support@remindmybill.com
                        </p>
                        <p>
                            <strong className="text-white">Response Time:</strong>{' '}
                            We typically respond within 24 hours on business days
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
