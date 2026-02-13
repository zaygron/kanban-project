'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BoardList from '@/components/BoardList';
import CreateBoardModal from '@/components/CreateBoardModal';

export default function DashboardPage() {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex flex-shrink-0 items-center">
                            <span className="text-xl font-bold text-indigo-600">Kanban</span>
                        </div>
                        <div className="flex items-center">
                            <span className="mr-4 text-gray-700">Hello, {user.name}</span>
                            <button
                                onClick={() => logout()}
                                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        >
                            New Board
                        </button>
                    </div>

                    <div className="mt-6">
                        <BoardList refreshTrigger={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />
                    </div>
                </div>
            </main>

            <CreateBoardModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={() => setRefreshKey(k => k + 1)}
            />
        </div>
    );
}
