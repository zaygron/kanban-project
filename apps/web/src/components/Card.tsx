import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface CardProps {
    card: { id: string; title: string };
    onRefresh?: () => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    isDragging?: boolean;
    isOverlay?: boolean;
    forwardedRef?: React.Ref<HTMLDivElement>;
}

export default function Card({
    card,
    onRefresh,
    style,
    attributes,
    listeners,
    isDragging,
    isOverlay,
    forwardedRef
}: CardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(card.title);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (title.trim() === '' || title === card.title) {
            setIsEditing(false);
            setTitle(card.title);
            return;
        }

        setLoading(true);
        try {
            await apiFetch(`/cards/${card.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ title }),
            });
            setIsEditing(false);
            onRefresh?.();
        } catch (error) {
            console.error('Failed to update card', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this card?')) return;

        setLoading(true);
        try {
            await apiFetch(`/cards/${card.id}`, {
                method: 'DELETE',
            });
            onRefresh?.();
        } catch (error) {
            console.error('Failed to delete card', error);
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setTitle(card.title);
        }
    };

    // Overlay or Dragging Helper Style
    if (isOverlay) {
        return (
            <div
                ref={forwardedRef}
                style={style}
                className="cursor-grabbing rounded bg-white p-3 shadow-xl ring-2 ring-indigo-500 opacity-90 h-auto text-sm text-gray-800 flex justify-between items-start"
            >
                <span className="flex-1 break-words">{card.title}</span>
            </div>
        );
    }

    if (isDragging) {
        return (
            <div
                ref={forwardedRef}
                style={style}
                className="cursor-move rounded bg-white p-3 shadow-md opacity-30 h-20"
            />
        );
    }

    if (isEditing) {
        return (
            <div
                ref={forwardedRef}
                style={style}
                className="rounded bg-white p-2 shadow-sm relative group"
            >
                <input
                    className="w-full rounded border px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    disabled={loading}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                />
            </div>
        );
    }

    return (
        <div
            ref={forwardedRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative cursor-move rounded bg-white p-3 shadow-sm hover:shadow-md transition-shadow text-sm text-gray-800 touch-none flex justify-between items-start"
            onDoubleClick={() => !isOverlay && setIsEditing(true)}
        >
            <span className="flex-1 break-words">{card.title}</span>

            {!isOverlay && (
                <button
                    onClick={handleDelete}
                    className="ml-2 hidden rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 group-hover:block"
                    title="Delete card"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                </button>
            )}
        </div>
    );
}
