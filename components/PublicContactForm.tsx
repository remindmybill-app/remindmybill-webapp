'use client';

import { useState } from 'react';

export default function PublicContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus('idle');

        try {
            const response = await fetch('/api/contact/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to send message');

            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            setStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Your Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="John Doe"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="john@example.com"
                    />
                </div>

                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Subject *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="How can we help?"
                    />
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Message *
                    </label>
                    <textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={6}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Tell us more about your inquiry..."
                    />
                </div>

                {/* Status Messages */}
                {status === 'success' && (
                    <div className="bg-primary/10 border border-primary rounded-lg p-4">
                        <p className="text-primary text-sm">
                            ✓ Message sent successfully! We'll get back to you within 24 hours.
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                        <p className="text-destructive text-sm">
                            ✗ Failed to send message. Please try again or email us directly.
                        </p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium py-3 rounded-lg transition-colors"
                >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
            </form>
        </div>
    );
}
