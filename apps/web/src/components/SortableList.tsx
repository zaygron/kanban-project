import { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { apiFetch } from '@/lib/api';
import SortableCard from './SortableCard';
import AddCardForm from './AddCardForm';

interface Card {
    id: string;
    title: string;
}

interface List {
    id: string;
    title: string;
    cards: Card[];
}

interface SortableListProps {
    list: List;
    boardId: string;
    onCardAdded: () => void;
}

export default function SortableList({ list, boardId, onCardAdded }: SortableListProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: list.id,
        data: useMemo(() => ({
            type: 'List',
        }), []),
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(list.title);
    const [loading, setLoading] = useState(false);

    // Reuse onCardAdded as a general refresh callback
    const onRefresh = onCardAdded;

    const handleSaveTitle = async () => {
        if (title.trim() === '' || title === list.title) {
            setIsEditing(false);
            setTitle(list.title);
            return;
        }

        setLoading(true);
        try {
            await apiFetch(`/lists/${list.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ title }),
            });
            setIsEditing(false);
            onRefresh();
        } catch (error) {
            console.error('Failed to update list', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteList = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete the list "${list.title}" and all its cards?`)) return;

        setLoading(true);
        try {
            await apiFetch(`/lists/${list.id}`, {
                method: 'DELETE',
            });
            onRefresh();
        } catch (error) {
            console.error('Failed to delete list', error);
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setTitle(list.title);
        }
    };


    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="mr-3 flex w-72 flex-shrink-0 flex-col rounded-md bg-gray-100 p-2 shadow opacity-50"
            >
                <div className="h-full bg-gray-200 rounded"></div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="mr-3 flex w-72 flex-shrink-0 flex-col rounded-md bg-gray-100 p-2 shadow max-h-full group/list"
        >
            <div
                {...attributes}
                {...listeners}
                className="mb-2 px-2 py-1 flex justify-between items-center cursor-move"
            >
                {isEditing ? (
                    <input
                        className="w-full rounded border px-2 py-1 text-sm font-bold text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        onMouseDown={(e) => e.stopPropagation()} // Allow clicking input without dragging
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={loading}
                    />
                ) : (
                    <div
                        className="text-sm font-bold text-gray-700 flex-1 truncate"
                        onDoubleClick={() => setIsEditing(true)}
                    >
                        {list.title}
                    </div>
                )}

                <button
                    onClick={handleDeleteList}
                    className="ml-2 hidden rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 group-hover/list:block"
                    title="Delete list"
                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-1 min-h-[50px]">
                <SortableContext
                    items={useMemo(() => list.cards.map(c => c.id), [JSON.stringify(list.cards.map(c => c.id))])}
                    strategy={verticalListSortingStrategy}
                >
                    {list.cards.map((card) => (
                        <SortableCard key={card.id} card={card} onRefresh={onRefresh} />
                    ))}
                </SortableContext>
                {list.cards.length === 0 && (
                    <div className="p-2 text-sm text-gray-400 italic text-center">No cards</div>
                )}
            </div>

            <AddCardForm
                boardId={boardId}
                listId={list.id}
                onCardAdded={onCardAdded}
            />
        </div>
    );
}
