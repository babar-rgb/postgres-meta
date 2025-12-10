import { useState } from 'react';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface UseDataImportProps {
    tableName: string;
    onSuccess?: () => void;
}

export function useDataImport({ tableName, onSuccess }: UseDataImportProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const importData = async (data: any[]) => {
        setIsImporting(true);
        setError(null);

        try {
            // Sanitize: Convert empty strings to null (PostgREST handles types usually, but empty strings can be tricky for numbers)
            const sanitizedData = data.map(row => {
                const newRow: any = {};
                for (const key in row) {
                    let value = row[key];
                    if (value === '') value = null;
                    newRow[key] = value;
                }
                return newRow;
            });

            // Bulk Insert
            await api.insertRows(tableName, sanitizedData);

            // Invalidate cache to refresh table
            queryClient.invalidateQueries({ queryKey: ['tableData', tableName] });

            if (onSuccess) onSuccess();

        } catch (err: any) {
            console.error("Import failed:", err);
            setError(err.message || "Failed to import data");
        } finally {
            setIsImporting(false);
        }
    };

    return {
        importData,
        isImporting,
        error
    };
}
