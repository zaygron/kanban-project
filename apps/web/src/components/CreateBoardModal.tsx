'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface CreateBoardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateBoardModal({ isOpen, onClose, onCreated }: CreateBoardModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await apiFetch('/boards', {
                method: 'POST',
                body: JSON.stringify({ name }),
            });
            setName('');
            onCreated();
            onClose();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to create board');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-xl font-bold">Create New Board</h2>

                {error && <div className="mb-4 rounded bg-red-100 p-2 text-red-700">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-bold text-gray-700">Board Name</label>
                        <input
                            type="text"
                            className="w-full rounded border px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
