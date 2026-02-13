export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FetchOptions = RequestInit & {
    headers?: Record<string, string>;
};

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const config: RequestInit = {
        ...options,
        headers,
        credentials: 'include', // Important for cookies
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        let errorMessage = 'API request failed';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || response.statusText;
        } catch (e) {
            errorMessage = response.statusText;
        }
        throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
