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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">We're sorry to see you go</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Question 1: Required */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 ml-1">
                            What's the main reason you're canceling? <span className="text-destructive">*</span>
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            {CANCELLATION_REASONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${formData.reason === option.value ? 'bg-indigo-500/5 border-indigo-500/40 text-foreground ring-1 ring-indigo-500/20' : 'bg-muted/30 border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground'}`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={option.value}
                                        checked={formData.reason === option.value}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-4 h-4 text-indigo-600 border-border focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-bold">{option.label}</span>
                                </label>
                            ))}
                        </div>
                        {errors.reason && <p className="text-destructive text-xs font-bold mt-3 ml-1 uppercase tracking-wider">{errors.reason}</p>}
                    </div>

                    {/* Question 2: Required if "Other" selected */}
                    {formData.reason === "other" && (
                        <div className="animate-in slide-in-from-top-4 duration-300">
                            <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 ml-1">
                                Please tell us more <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                value={formData.reason_other}
                                onChange={(e) => setFormData({ ...formData, reason_other: e.target.value })}
                                placeholder="What's your reason for canceling?"
                                maxLength={200}
                                rows={3}
                                className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            />
                            <p className="text-[10px] font-bold text-muted-foreground mt-2 ml-1 uppercase tracking-widest">
                                {formData.reason_other.length}/200 characters
                            </p>
                            {errors.reason_other && (
                                <p className="text-destructive text-xs font-bold mt-2 ml-1 uppercase tracking-wider">{errors.reason_other}</p>
                            )}
                        </div>
                    )}

                    {/* Question 3: Optional - General Feedback */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 ml-1">
                            Any other feedback? (Optional)
                        </label>
                        <textarea
                            value={formData.general_feedback}
                            onChange={(e) => setFormData({ ...formData, general_feedback: e.target.value })}
                            placeholder="We'd love to hear your thoughts on how we can improve"
                            maxLength={500}
                            rows={3}
                            className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                        <p className="text-[10px] font-bold text-muted-foreground mt-2 ml-1 uppercase tracking-widest">
                            {formData.general_feedback.length}/500 characters
                        </p>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-muted hover:bg-muted/80 text-foreground px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Keep Subscription
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-white px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-destructive/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isSubmitting ? "Processing..." : "Confirm Cancel"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
