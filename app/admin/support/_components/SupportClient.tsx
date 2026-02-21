'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { updateSupportTicket } from '@/app/admin/_actions/index';

interface Ticket {
    id: string;
    email: string;
    subject: string;
    message: string;
    status: string;
    admin_notes: string | null;
    created_at: string;
}

interface SupportClientProps {
    tickets: Ticket[];
}

export default function SupportClient({ tickets }: SupportClientProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [isPending, startTransition] = useTransition();
    const [toast, setToast] = useState<string | null>(null);

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }

    function toggleExpand(id: string) {
        setExpandedId(expandedId === id ? null : id);
    }

    function getNote(ticket: Ticket): string {
        if (notes[ticket.id] !== undefined) return notes[ticket.id];
        return ticket.admin_notes || '';
    }

    function handleSaveNotes(id: string) {
        startTransition(async () => {
            await updateSupportTicket(id, { admin_notes: notes[id] || '' });
            showToast('Notes saved');
        });
    }

    function handleMarkResolved(id: string) {
        startTransition(async () => {
            await updateSupportTicket(id, { status: 'resolved' });
            showToast('Ticket marked as resolved');
        });
    }

    return (
        <div className="space-y-3">
            {toast && (
                <div className="text-green-400 bg-green-900/20 rounded-lg px-3 py-2 text-sm">
                    {toast}
                </div>
            )}

            {tickets.length === 0 && (
                <div className="bg-gray-900 rounded-xl border border-gray-800 px-5 py-8 text-center text-gray-500">
                    No tickets found
                </div>
            )}

            {tickets.map((ticket) => {
                const isExpanded = expandedId === ticket.id;
                return (
                    <div
                        key={ticket.id}
                        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                    >
                        {/* COLLAPSED HEADER */}
                        <button
                            onClick={() => toggleExpand(ticket.id)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/30 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">
                                    {ticket.subject}
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    {ticket.email} ·{' '}
                                    {format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
                                </p>
                            </div>
                            {isExpanded ? (
                                <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
                            ) : (
                                <ChevronRight size={16} className="text-gray-500 flex-shrink-0" />
                            )}
                        </button>

                        {/* EXPANDED CONTENT */}
                        {isExpanded && (
                            <div className="px-5 pb-5 space-y-4 border-t border-gray-800">
                                {/* Full message */}
                                <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                                        {ticket.message}
                                    </p>
                                </div>

                                {/* Admin Notes */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">
                                        Admin Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={getNote(ticket)}
                                        onChange={(e) =>
                                            setNotes((prev) => ({
                                                ...prev,
                                                [ticket.id]: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600 resize-none"
                                        placeholder="Add internal notes…"
                                    />
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSaveNotes(ticket.id)}
                                        disabled={isPending}
                                        className="text-sm px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
                                    >
                                        Save Notes
                                    </button>
                                    {ticket.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleMarkResolved(ticket.id)}
                                            disabled={isPending}
                                            className="text-sm px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white disabled:opacity-50 transition-colors"
                                        >
                                            ✓ Mark Resolved
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
