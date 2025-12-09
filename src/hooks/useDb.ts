import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface TableInfo {
    id: number;
    schema: string;
    name: string;
    bytes: number;
    live_rows_estimate: number;
}

// --- Hooks ---

export const useTables = () => {
    return useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const data = await api.fetchTables();
            return (data as TableInfo[]).sort((a, b) => a.name.localeCompare(b.name));
        },
        retry: 1,
    });
}

export const useTableData = ({ tableName, pageIndex, pageSize }: { tableName: string; pageIndex: number; pageSize: number }) => {
    return useQuery({
        queryKey: ['tableData', tableName, pageIndex, pageSize],
        queryFn: async () => {
            const offset = pageIndex * pageSize;
            const result = await api.fetchTableData(tableName, pageSize, offset);
            return result as { rows: any[]; totalCount: number };
        },
        placeholderData: (prev) => prev,
        enabled: !!tableName,
        retry: 1,
    });
};

export const useUpdateCell = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ tableName, rowId, column, value }: { tableName: string, rowId: any, column: string, value: any }) => {
            return api.updateCell(tableName, rowId, column, value);
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['tableData', vars.tableName] });
        },
    });
};

// useSqlExecutor removed in favor of useSql.ts
