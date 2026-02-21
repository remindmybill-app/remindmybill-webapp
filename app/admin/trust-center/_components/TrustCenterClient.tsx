'use client';

import { useState, useTransition } from 'react';
import {
    approveServiceRequest,
    dismissServiceRequest,
    upsertBenchmark,
    deleteBenchmark,
} from '@/app/admin/_actions/index';

interface Benchmark {
    id: string;
    name: string;
    category: string;
    avg_cost: number;
}

interface ServiceRequest {
    id: string;
    name?: string;
    service_name?: string;
    category: string;
    avg_cost?: number;
    suggested_cost?: number;
    created_at: string;
    profiles?: { email: string } | { email: string }[] | null;
}

interface TrustCenterClientProps {
    benchmarks: Benchmark[];
    requests: ServiceRequest[];
}

export default function TrustCenterClient({
    benchmarks: initialBenchmarks,
    requests: initialRequests,
}: TrustCenterClientProps) {
    const [isPending, startTransition] = useTransition();
    const [toast, setToast] = useState<string | null>(null);
    const [benchmarks, setBenchmarks] = useState(initialBenchmarks);
    const [requests, setRequests] = useState(initialRequests);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formCost, setFormCost] = useState('');

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }

    function getEmail(request: ServiceRequest): string {
        if (!request.profiles) return '—';
        if (Array.isArray(request.profiles)) {
            return request.profiles[0]?.email || '—';
        }
        return request.profiles.email || '—';
    }

    function handleApprove(id: string) {
        startTransition(async () => {
            await approveServiceRequest(id);
            setRequests((prev) => prev.filter((r) => r.id !== id));
            showToast('Request approved');
        });
    }

    function handleDismiss(id: string) {
        startTransition(async () => {
            await dismissServiceRequest(id);
            setRequests((prev) => prev.filter((r) => r.id !== id));
            showToast('Request dismissed');
        });
    }

    function handleEdit(benchmark: Benchmark) {
        setEditId(benchmark.id);
        setFormName(benchmark.name);
        setFormCategory(benchmark.category);
        setFormCost(String(benchmark.avg_cost));
        setShowForm(true);
    }

    function handleAdd() {
        setEditId(null);
        setFormName('');
        setFormCategory('');
        setFormCost('');
        setShowForm(true);
    }

    function handleSave() {
        startTransition(async () => {
            await upsertBenchmark(editId, {
                name: formName,
                category: formCategory,
                avg_cost: parseFloat(formCost) || 0,
            });
            setShowForm(false);
            showToast(editId ? 'Benchmark updated' : 'Benchmark created');
            // Optimistic update
            if (editId) {
                setBenchmarks((prev) =>
                    prev.map((b) =>
                        b.id === editId
                            ? {
                                ...b,
                                name: formName,
                                category: formCategory,
                                avg_cost: parseFloat(formCost) || 0,
                            }
                            : b
                    )
                );
            }
        });
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            await deleteBenchmark(id);
            setBenchmarks((prev) => prev.filter((b) => b.id !== id));
            showToast('Benchmark deleted');
        });
    }

    return (
        <div className="space-y-6">
            {/* TOAST */}
            {toast && (
                <div className="text-green-400 bg-green-900/20 rounded-lg px-3 py-2 text-sm">
                    {toast}
                </div>
            )}

            {/* SECTION 1: PENDING USER REQUESTS */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="px-5 py-3 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-white">
                        Pending User Requests ({requests.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                <th className="text-left px-5 py-2">Service</th>
                                <th className="text-left px-5 py-2">Category</th>
                                <th className="text-left px-5 py-2">Suggested Cost</th>
                                <th className="text-left px-5 py-2">User Email</th>
                                <th className="text-left px-5 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.id} className="border-b border-gray-800/50">
                                    <td className="px-5 py-3 text-white">
                                        {req.name || req.service_name || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400">{req.category}</td>
                                    <td className="px-5 py-3 text-gray-300">
                                        ${Number(req.avg_cost || req.suggested_cost || 0).toFixed(2)}
                                    </td>
                                    <td className="px-5 py-3 text-gray-400 text-xs">
                                        {getEmail(req)}
                                    </td>
                                    <td className="px-5 py-3 flex gap-2">
                                        <button
                                            onClick={() => handleApprove(req.id)}
                                            disabled={isPending}
                                            className="text-xs px-3 py-1 rounded-lg border border-green-700 text-green-400 hover:bg-green-900/20 disabled:opacity-50 transition-colors"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleDismiss(req.id)}
                                            disabled={isPending}
                                            className="text-xs px-3 py-1 rounded-lg border border-red-700 text-red-400 hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-4 text-center text-gray-500"
                                    >
                                        No pending requests
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECTION 2: SERVICE BENCHMARKS */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">
                        Service Benchmarks ({benchmarks.length})
                    </h2>
                    <button
                        onClick={handleAdd}
                        className="text-xs px-3 py-1 rounded-lg border border-blue-700 text-blue-400 hover:bg-blue-900/20 transition-colors"
                    >
                        + Add
                    </button>
                </div>

                {/* INLINE FORM */}
                {showForm && (
                    <div className="bg-gray-800/30 px-5 py-4 border-b border-gray-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                                type="text"
                                placeholder="Service Name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                            />
                            <input
                                type="text"
                                placeholder="Category"
                                value={formCategory}
                                onChange={(e) => setFormCategory(e.target.value)}
                                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                            />
                            <input
                                type="number"
                                placeholder="Avg Cost"
                                value={formCost}
                                onChange={(e) => setFormCost(e.target.value)}
                                className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-600"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={isPending}
                                className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
                            >
                                {editId ? 'Update' : 'Save'}
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-sm px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                        <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                <th className="text-left px-5 py-2">Name</th>
                                <th className="text-left px-5 py-2">Category</th>
                                <th className="text-left px-5 py-2">Avg Cost/mo</th>
                                <th className="text-left px-5 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {benchmarks.map((b) => (
                                <tr key={b.id} className="border-b border-gray-800/50">
                                    <td className="px-5 py-3 text-white">{b.name}</td>
                                    <td className="px-5 py-3 text-gray-400">{b.category}</td>
                                    <td className="px-5 py-3 text-gray-300">
                                        ${Number(b.avg_cost).toFixed(2)}
                                    </td>
                                    <td className="px-5 py-3 flex gap-2">
                                        <button
                                            onClick={() => handleEdit(b)}
                                            className="text-xs px-3 py-1 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(b.id)}
                                            disabled={isPending}
                                            className="text-xs px-3 py-1 rounded-lg border border-red-700 text-red-400 hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {benchmarks.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-5 py-4 text-center text-gray-500"
                                    >
                                        No benchmarks yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
