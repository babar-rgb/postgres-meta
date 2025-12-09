import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { FilterState, SortState, buildPostgrestQuery } from '../lib/postgrest';

interface UseTableDataParams {
    tableName: string;
    pageIndex: number;
    pageSize: number;
    filters?: FilterState[];
    sort?: SortState | null;
}

export const useTableData = ({ tableName, pageIndex, pageSize, filters = [], sort = null }: UseTableDataParams) => {
    return useQuery({
        queryKey: ['tableData', tableName, pageIndex, pageSize, filters, sort],
        queryFn: async () => {
            const offset = pageIndex * pageSize;

            // We need to inject the query string into api.fetchTableData
            // But currently api.fetchTableData only accepts fixed args.
            // We should either update api.ts or use a lower level call here.
            // For cleanliness, let's assume we update api.ts to accept `queryString`
            // OR we construct the full URL logic here if api.ts is too rigid.
            // Let's modify api.ts to accept options.

            // Generating query string
            const queryParams = buildPostgrestQuery(filters, sort);

            const result = await api.fetchTableData(tableName, pageSize, offset, queryParams);
            return result as { rows: any[]; totalCount: number };
        },
        placeholderData: (prev) => prev,
        enabled: !!tableName,
        retry: 1,
    });
};
