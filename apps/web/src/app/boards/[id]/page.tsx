'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AddListForm from '@/components/AddListForm';
import SortableList from '@/components/SortableList';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { rankBetween } from '@kanban/shared';
import SortableCard from '@/components/SortableCard';
import CardComponent from '@/components/Card';

interface Card {
    id: string;
    title: string;
    rank: number;
    listId: string;
}

interface List {
    id: string;
    title: string;
    rank: number;
    cards: Card[];
}

interface Board {
    id: string;
    name: string;
    lists: List[];
}

export default function BoardPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const [board, setBoardState] = useState<Board | null>(null);
    const boardRef = useRef<Board | null>(null);

    const setBoard = (data: Board | null | ((prev: Board | null) => Board | null)) => {
        if (typeof data === 'function') {
            setBoardState(prev => {
                const newVal = data(prev);
                boardRef.current = newVal;
                return newVal;
            });
        } else {
            boardRef.current = data;
            setBoardState(data);
        }
    };

    const [activeCard, setActiveCard] = useState<Card | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const refreshBoard = useCallback(async () => {
        try {
            const data = await apiFetch<Board>(`/boards/${id}`);
            data.lists.forEach(l => {
                l.cards.forEach(c => { c.listId = l.id; });
            });
            setBoard(data);
        } catch (error) {
            console.error('Failed to refresh board', error);
        }
    }, [id]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (id) {
            refreshBoard();
        }
    }, [id, user, authLoading, router, refreshBoard]);

    function findContainer(id: string): string | undefined {
        const currentBoard = boardRef.current;
        if (!currentBoard) return undefined;
        if (currentBoard.lists.find(l => l.id === id)) return id;
        const list = currentBoard.lists.find(l => l.cards.find(c => c.id === id));
        return list?.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customCollisionDetection = useCallback((args: any) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length === 0) return [];

        const currentBoard = boardRef.current;
        if (!currentBoard) return [];

        // Check if any collision is a Card (SortableItem)
        const isOverCard = pointerCollisions.some(c =>
            currentBoard.lists.some(l => l.cards.some(card => card.id === c.id))
        );

        if (isOverCard) {
            return closestCorners(args);
        }

        // If not over a card, check if over a list container
        const containerCollision = pointerCollisions.find(c => currentBoard.lists.some(l => l.id === c.id));
        if (containerCollision) {
            return [containerCollision];
        }

        return closestCorners(args);
    }, []);

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const { id } = active;
        const currentBoard = boardRef.current;

        let card: Card | undefined;
        currentBoard?.lists.forEach(l => {
            const found = l.cards.find(c => c.id === id);
            if (found) card = found;
        });
        setActiveCard(card || null);
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        const { id: activeId } = active;
        const { id: overId } = over || {};

        if (!overId) return;

        // Optimized: Perform all logic inside setBoard to guarantee fresh state
        setBoard((prev) => {
            if (!prev) return null;

            // Helper to find container in the fresh state
            const findContainerInState = (id: string, boardState: Board): string | undefined => {
                if (boardState.lists.find(l => l.id === id)) return id;
                return boardState.lists.find(l => l.cards.find(c => c.id === id))?.id;
            };

            const activeContainer = findContainerInState(activeId as string, prev);
            const overContainer = findContainerInState(overId as string, prev);

            if (
                !activeContainer ||
                !overContainer ||
                activeContainer === overContainer
            ) {
                return prev;
            }

            const activeList = prev.lists.find(l => l.id === activeContainer);
            const overList = prev.lists.find(l => l.id === overContainer);

            if (!activeList || !overList) {
                return prev;
            }

            if (activeList.id === overList.id) {
                return prev;
            }

            // Check if active item is already in overList (avoid flickering/loop)
            if (overList.cards.some(c => c.id === activeId)) {
                return prev;
            }

            const activeItems = activeList.cards;
            const overItems = overList.cards;

            const activeIndex = activeItems.findIndex(c => c.id === activeId);
            const overIndex = overItems.findIndex(c => c.id === overId);

            let newIndex;
            const isOverContainer = overId === overContainer;

            if (isOverContainer) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top >
                    over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            // Create new Board state
            const newLists = prev.lists.map(l => ({ ...l, cards: [...l.cards] }));
            const newActiveList = newLists.find(l => l.id === activeList.id)!;
            const newOverList = newLists.find(l => l.id === overList.id)!;

            if (activeIndex !== -1) {
                const [movedCard] = newActiveList.cards.splice(activeIndex, 1);
                movedCard.listId = overList.id;

                let insertIndex = newIndex;
                if (insertIndex < 0) insertIndex = 0;
                if (insertIndex > newOverList.cards.length) insertIndex = newOverList.cards.length;

                newOverList.cards.splice(insertIndex, 0, movedCard);
            }

            return { ...prev, lists: newLists };
        });
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        const { id: activeId } = active;
        const { id: overId } = over || {};

        if (!overId) {
            setActiveCard(null);
            return;
        }

        const activeType = active.data.current?.type;

        // --- List Reordering ---
        if (activeType === 'List') {
            if (activeId !== overId) {
                setBoard((prev) => {
                    if (!prev) return null;
                    const oldIndex = prev.lists.findIndex(l => l.id === activeId);
                    const newIndex = prev.lists.findIndex(l => l.id === overId);

                    const newLists = arrayMove(prev.lists, oldIndex, newIndex);

                    const list = newLists[newIndex];
                    const prevList = newLists[newIndex - 1];
                    const nextList = newLists[newIndex + 1];
                    const newRank = rankBetween(prevList?.rank || null, nextList?.rank || null);

                    if (newRank !== null) {
                        newLists[newIndex] = { ...list, rank: newRank };
                    }

                    apiFetch(`/lists/${activeId}/move`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            boardId: prev.id,
                            rank: newRank !== null ? newRank : undefined,
                            beforeListId: prevList?.id,
                            afterListId: nextList?.id,
                        })
                    })
                        .then(() => refreshBoard()) // Always refresh to sync ranks
                        .catch(e => console.error("Move list failed", e));

                    return { ...prev, lists: newLists };
                });
            }
            setActiveCard(null);
            return;
        }

        // --- Card Reordering ---
        const currentBoard = boardRef.current;
        if (!currentBoard) {
            setActiveCard(null);
            return;
        }

        const activeContainer = findContainer(activeId as string);
        const overContainer = findContainer(overId as string);

        if (
            activeContainer &&
            overContainer &&
            activeContainer === overContainer
        ) {
            // Same container reorder
            const list = currentBoard.lists.find(l => l.id === activeContainer);
            if (!list) { setActiveCard(null); return; }

            const activeIndex = list.cards.findIndex(c => c.id === activeId);
            const overIndex = list.cards.findIndex(c => c.id === overId);

            if (activeIndex !== overIndex) {
                const newCards = arrayMove(list.cards, activeIndex, overIndex);

                const prevCard = newCards[overIndex - 1];
                const nextCard = newCards[overIndex + 1];
                const newRank = rankBetween(prevCard?.rank || null, nextCard?.rank || null);

                setBoard((prev) => {
                    if (!prev) return null;
                    const newLists = prev.lists.map(l => {
                        if (l.id === activeContainer) {
                            // Use valid rank if we have it, otherwise keep old rank but sorted order is correct
                            return { ...l, cards: newCards.map(c => c.id === activeId && newRank !== null ? ({ ...c, rank: newRank }) : c) };
                        }
                        return l;
                    });
                    return { ...prev, lists: newLists };
                });

                apiFetch(`/cards/${activeId}/move`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        listId: activeContainer,
                        rank: newRank !== null ? newRank : undefined,
                        boardId: currentBoard.id,
                        beforeCardId: prevCard?.id,
                        afterCardId: nextCard?.id,
                    })
                })
                    .then(() => refreshBoard())
                    .catch(e => console.error("Move failed", e));
            }
        } else if (activeContainer && overContainer && activeContainer !== overContainer) {
            // Between lists
            const overList = currentBoard.lists.find(l => l.id === overContainer);
            if (!overList) { setActiveCard(null); return; }

            const overIndex = overList.cards.findIndex(c => c.id === activeId);
            let newRank: number | null = null;
            let prevCard: Card | undefined;
            let nextCard: Card | undefined;

            // Logic to find neighbors from current state
            const targetList = currentBoard.lists.find(l => l.id === overContainer);
            if (targetList) {
                const idx = targetList.cards.findIndex(c => c.id === activeId);
                if (idx !== -1) {
                    prevCard = targetList.cards[idx - 1];
                    nextCard = targetList.cards[idx + 1];
                    newRank = rankBetween(prevCard?.rank || null, nextCard?.rank || null);

                    setBoard(prev => {
                        if (!prev) return null;
                        const newLists = prev.lists.map(l => {
                            if (l.id === overContainer) {
                                const newCards = [...l.cards];
                                if (newCards[idx] && newRank !== null) {
                                    newCards[idx] = { ...newCards[idx], rank: newRank };
                                }
                                return { ...l, cards: newCards };
                            }
                            return l;
                        });
                        return { ...prev, lists: newLists };
                    });
                }
            }

            apiFetch(`/cards/${activeId}/move`, {
                method: 'PATCH',
                body: JSON.stringify({
                    listId: overContainer,
                    rank: newRank !== null ? newRank : undefined,
                    boardId: currentBoard.id,
                    beforeCardId: prevCard?.id,
                    afterCardId: nextCard?.id,
                })
            })
                .then(() => refreshBoard())
                .catch(e => console.error("Move failed", e));
        }

        setActiveCard(null);
    }

    const listIds = useMemo(() => board?.lists.map(l => l.id) || [], [JSON.stringify(board?.lists.map(l => l.id))]);

    if (!user || !board) return <div>Loading...</div>;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen flex-col bg-blue-500">
                <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white shadow">
                    <h1 className="text-xl font-bold">{board.name}</h1>
                    <button onClick={() => router.push('/dashboard')} className="font-bold hover:bg-blue-700 px-2 py-1 rounded">
                        Dashboard
                    </button>
                </div>

                <div className="flex flex-1 overflow-x-auto p-4">
                    <SortableContext
                        items={listIds}
                        strategy={horizontalListSortingStrategy}
                    >
                        {board.lists.map(list => (
                            <SortableList
                                key={list.id}
                                list={list}
                                boardId={board.id}
                                onCardAdded={refreshBoard}
                            />
                        ))}
                    </SortableContext>

                    <AddListForm
                        boardId={board.id}
                        onListAdded={refreshBoard}
                    />
                </div>

                <DragOverlay>
                    {activeCard ? <CardComponent card={activeCard} isOverlay /> : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}
