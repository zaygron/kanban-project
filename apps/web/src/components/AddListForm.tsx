'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface AddListFormProps {
    boardId: string;
    onListAdded: () => void;
}

export default function AddListForm({ boardId, onListAdded }: AddListFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            await apiFetch('/lists', {
                method: 'POST',
                body: JSON.stringify({ boardId, title }),
            });
            setTitle('');
            setIsEditing(false);
            onListAdded();
        } catch (error) {
            console.error('Failed to add list', error);
            alert('Failed to add list');
        } finally {
            setLoading(false);
        }
    }

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="flex w-72 flex-shrink-0 items-center rounded bg-white/20 p-2 text-white hover:bg-white/30"
            >
                <span className="mr-2 text-xl">+</span> Add another list
            </button>
        );
    }

    return (
        <div className="w-72 flex-shrink-0 rounded bg-gray-100 p-2 shadow">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="List title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                />
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Adding...' : 'Add List'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        &#x2715;
                    </button>
                </div>
            </form>
        </div>
    );
}
