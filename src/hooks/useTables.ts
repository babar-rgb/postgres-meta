import { useQuery } from '@tanstack/react-query';

export interface TableInfo {
    id: number;
    schema: string;
    name: string;
    bytes: number; // approximate size
    live_rows_estimate: number;
}

export const useTables = () => {
    return useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            // Postgres-Meta: GET /tables endpoint
            // Note: It might return more usage info. We just need names for now.
            // If this 404s, user might need to check port.
            const response = await fetch('/api/meta/tables');

            if (!response.ok) {
                throw new Error(`Failed to fetch tables: ${response.statusText}`);
            }

            const data = await response.json();

            // Filter for public schema primarily, or group later
            // For now, let's return all, sorted by name
            // Postgres-Meta 'tables' endpoint generally returns array of table objects
            return (data as TableInfo[]).sort((a, b) => a.name.localeCompare(b.name));
        }
    });
}
