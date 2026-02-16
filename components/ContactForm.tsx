'use client';

import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

interface ContactFormProps {
    userEmail: string;
    userName: string;
    userTier: string;
}

const SUBJECTS = [
    'Billing & Subscription',
    'Technical Issue',
    'Feature Request',
    'Account Help',
    'General Question',
    'Other'
];

export default function ContactForm({ userEmail, userName, userTier }: ContactFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: userName,
        email: userEmail,
        subject: '',
        message: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.subject) newErrors.subject = 'Please select a subject';
        if (!formData.message.trim()) newErrors.message = 'Message is required';
        if (formData.message.length < 20) {
            newErrors.message = 'Message must be at least 20 characters';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            const response = await fetch('/api/contact/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, userTier })
            });

            if (!response.ok) throw new Error('Submission failed');

            setIsSuccess(true);
            setFormData({ ...formData, subject: '', message: '' });
        } catch (error) {
            alert('Failed to send message. Please try again or email support@remindmybill.com');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/50 rounded-xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                    Message Sent!
                </h2>
                <p className="text-gray-400 mb-6">
                    We've received your message and will get back to you within 24 hours.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Send Another Message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            {/* Name Field */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Email Field */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                </label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                />
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Subject Dropdown */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                </label>
                <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Select a subject...</option>
                    {SUBJECTS.map((subject) => (
                        <option key={subject} value={subject}>
                            {subject}
                        </option>
                    ))}
                </select>
                {errors.subject && <p className="text-red-400 text-sm mt-1">{errors.subject}</p>}
            </div>

            {/* Message Textarea */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                </label>
                <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    maxLength={1000}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us how we can help..."
                />
                <div className="flex items-center justify-between mt-2">
                    {errors.message && <p className="text-red-400 text-sm">{errors.message}</p>}
                    <p className="text-xs text-gray-500 ml-auto">
                        {formData.message.length}/1000 characters
                    </p>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-500/50 disabled:to-blue-600/50 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
        </form>
    );
}
