"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface CancellationSurveyModalProps {
    isOpen: boolean;
    onClose: () => void;
    userTier: string;
    userEmail: string;
}

const CANCELLATION_REASONS = [
    { value: "too_expensive", label: "Too expensive" },
    { value: "not_using", label: "Not using it enough" },
    { value: "missing_features", label: "Missing features I need" },
    { value: "found_alternative", label: "Found a better alternative" },
    { value: "other", label: "Other" },
];

export default function CancellationSurveyModal({
    isOpen,
    onClose,
    userTier,
    userEmail,
}: CancellationSurveyModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        reason: "",
        reason_other: "",
        general_feedback: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: Record<string, string> = {};
        if (!formData.reason) {
            newErrors.reason = "Please select a reason";
        }
        if (formData.reason === "other" && !formData.reason_other.trim()) {
            newErrors.reason_other = "Please specify your reason";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/subscriptions/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    survey: formData,
                    tier: userTier,
                    email: userEmail,
                }),
            });

            if (!response.ok) throw new Error("Cancellation failed");

            // Show success message
            onClose();
            router.push("/dashboard?cancelled=true");
            router.refresh();
        } catch (error) {
            alert("Failed to process cancellation. Please try again or contact support.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">We're sorry to see you go</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Question 1: Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            What's the main reason you're canceling? <span className="text-red-400">*</span>
                        </label>
                        <div className="space-y-2">
                            {CANCELLATION_REASONS.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={option.value}
                                        checked={formData.reason === option.value}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-sm text-gray-300">{option.label}</span>
                                </label>
                            ))}
                        </div>
                        {errors.reason && <p className="text-red-400 text-sm mt-2">{errors.reason}</p>}
                    </div>

                    {/* Question 2: Required if "Other" selected */}
                    {formData.reason === "other" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Please tell us more <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={formData.reason_other}
                                onChange={(e) => setFormData({ ...formData, reason_other: e.target.value })}
                                placeholder="What's your reason for canceling?"
                                maxLength={200}
                                rows={3}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.reason_other.length}/200 characters
                            </p>
                            {errors.reason_other && (
                                <p className="text-red-400 text-sm mt-1">{errors.reason_other}</p>
                            )}
                        </div>
                    )}

                    {/* Question 3: Optional - General Feedback */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Any other feedback? (Optional)
                        </label>
                        <textarea
                            value={formData.general_feedback}
                            onChange={(e) => setFormData({ ...formData, general_feedback: e.target.value })}
                            placeholder="We'd love to hear your thoughts on how we can improve"
                            maxLength={500}
                            rows={4}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.general_feedback.length}/500 characters
                        </p>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            Keep My Subscription
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            {isSubmitting ? "Processing..." : "Continue Cancellation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
