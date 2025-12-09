import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedQuery {
    id: string;
    name: string;
    sql: string;
    createdAt: number;
}

export interface HistoryItem {
    id: string;
    sql: string;
    status: 'success' | 'error';
    timestamp: number;
    durationMs?: number;
}

interface SqlStore {
    savedQueries: SavedQuery[];
    history: HistoryItem[];

    // Actions
    saveQuery: (name: string, sql: string) => void;
    deleteSavedQuery: (id: string) => void;
    addToHistory: (sql: string, status: 'success' | 'error', durationMs?: number) => void;
    clearHistory: () => void;
}

export const useSqlStore = create<SqlStore>()(
    persist(
        (set) => ({
            savedQueries: [],
            history: [],

            saveQuery: (name, sql) => set((state) => ({
                savedQueries: [
                    { id: crypto.randomUUID(), name, sql, createdAt: Date.now() },
                    ...state.savedQueries
                ]
            })),

            deleteSavedQuery: (id) => set((state) => ({
                savedQueries: state.savedQueries.filter((q) => q.id !== id)
            })),

            addToHistory: (sql, status, durationMs) => set((state) => {
                const newItem: HistoryItem = {
                    id: crypto.randomUUID(),
                    sql,
                    status,
                    timestamp: Date.now(),
                    durationMs
                };
                // Keep only last 50 items
                const newHistory = [newItem, ...state.history].slice(0, 50);
                return { history: newHistory };
            }),

            clearHistory: () => set({ history: [] }),
        }),
        {
            name: 'sql-librarian-store', // LocalStorage key
        }
    )
);
