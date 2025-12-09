import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateCellProps {
    tableName: string;
    rowId: string | number; // Assuming there is an 'id' column. If PK is different, logic needs adjustment.
    paddingKey: string; // The column name
    value: any;
}

export const useUpdateCell = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ tableName, rowId, paddingKey, value }: UpdateCellProps) => {
            // Assuming 'id' is the primary key. 
            // In a robust app, we should introspect the schema to find the PK.
            // For now, prompt assumes 'Data First' simplistic approach.
            const response = await fetch(`/api/data/${tableName}?id=eq.${rowId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ [paddingKey]: value }),
            });

            if (!response.ok) {
                throw new Error(`Error updating cell: ${response.statusText}`);
            }

            return true;
        },
        onSuccess: (_, variables) => {
            // Invalidate query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ['tableData', variables.tableName] });
        },
    });
};
