'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface AddCardFormProps {
    boardId: string;
    listId: string;
    onCardAdded: () => void;
}

export default function AddCardForm({ boardId, listId, onCardAdded }: AddCardFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            await apiFetch('/cards', {
                method: 'POST',
                body: JSON.stringify({ boardId, listId, title }),
            });
            setTitle('');
            // Keep editing to add multiple cards quickly?
            // Or close? Let's keep input focused/editing for rapid entry.
            setTitle('');
            onCardAdded();
            // Focus back to input done automatically if not unmounted
        } catch (error) {
            console.error('Failed to add card', error);
            alert('Failed to add card');
        } finally {
            setLoading(false);
        }
    }

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="mt-2 flex w-full items-center rounded px-2 py-1 text-gray-500 hover:bg-gray-200"
            >
                <span className="mr-1 text-lg">+</span> Add a card
            </button>
        );
    }

    return (
        <div className="mt-2">
            <form onSubmit={handleSubmit}>
                <textarea
                    className="w-full rounded border p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter a title for this card..."
                    rows={2}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <div className="mt-1 flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Adding...' : 'Add Card'}
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
