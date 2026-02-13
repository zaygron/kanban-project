'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { LoginDto, RegisterDto, AuthResponseDto } from '@kanban/shared';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (data: LoginDto) => Promise<void>;
    register: (data: RegisterDto) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const data = await apiFetch<{ user: User }>('/me');
            setUser(data.user);
        } catch (error) {
            // Quietly fail auth check
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function login(data: LoginDto) {
        setIsLoading(true);
        try {
            const response = await apiFetch<AuthResponseDto>('/auth/login', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            setUser(response.user);
            router.push('/dashboard');
        } catch (error) {
            // console.error('Login failed', error); // Remove log to avoid console noise, let UI handle it
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    async function register(data: RegisterDto) {
        setIsLoading(true);
        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            // Auto login or redirect to login? Let's redirect to login for now or auto-login if backend supports it.
            // Backend register does NOT set cookie currently. So redirect to login.
            router.push('/login');
        } catch (error) {
            console.error('Registration failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }

    async function logout() {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
