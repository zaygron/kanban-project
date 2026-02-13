'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Board {
    id: string;
    name: string;
    updated_at: string;
}

export default function BoardList({ refreshTrigger, onRefresh }: { refreshTrigger: number; onRefresh?: () => void }) {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const loadBoards = async () => {
        try {
            const data = await apiFetch<Board[]>('/boards');
            setBoards(data);
        } catch (error) {
            console.error('Failed to load boards', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBoards();
    }, [refreshTrigger]);

    const handleEditStart = (e: React.MouseEvent, board: Board) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();
        setEditingId(board.id);
        setEditName(board.name);
    };

    const handleEditSave = async (id: string) => {
        if (!editName.trim()) {
            setEditingId(null);
            return;
        }
        try {
            // Optimistic update
            setBoards(prev => prev.map(b => b.id === id ? { ...b, name: editName } : b));
            setEditingId(null);

            await apiFetch(`/boards/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: editName }),
            });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Failed to update board', error);
            loadBoards(); // Revert on error
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            handleEditSave(id);
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete the board "${name}"?`)) return;

        try {
            setBoards(prev => prev.filter(b => b.id !== id));
            await apiFetch(`/boards/${id}`, { method: 'DELETE' });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Failed to delete board', error);
            loadBoards();
        }
    };

    if (loading) return <div>Loading boards...</div>;

    if (boards.length === 0) {
        return <p className="text-gray-500">No boards found. Create one to get started!</p>;
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
                <div key={board.id} className="relative group">
                    <Link
                        href={`/boards/${board.id}`}
                        className="block rounded-lg bg-white p-6 shadow transition hover:shadow-md h-full"
                    >
                        {editingId === board.id ? (
                            <div onClick={(e) => e.preventDefault()}>
                                <input
                                    className="w-full rounded border px-2 py-1 text-lg font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={() => handleEditSave(board.id)}
                                    onKeyDown={(e) => handleKeyDown(e, board.id)}
                                    autoFocus
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        ) : (
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-medium text-gray-900 truncate pr-8">{board.name}</h3>
                            </div>
                        )}
                        <p className="mt-2 text-sm text-gray-500">
                            Updated: {new Date(board.updated_at).toLocaleDateString()}
                        </p>
                    </Link>

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 hidden group-hover:flex space-x-1">
                        <button
                            onClick={(e) => handleEditStart(e, board)}
                            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded"
                            title="Edit Title"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button
                            onClick={(e) => handleDelete(e, board.id, board.name)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete Board"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
