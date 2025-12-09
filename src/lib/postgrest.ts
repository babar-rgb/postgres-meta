
export interface FilterState {
    column: string;
    operator: string;
    value: string;
}

export interface SortState {
    column: string;
    ascending: boolean;
}

export const buildPostgrestQuery = (filters: FilterState[], sort?: SortState | null): string => {
    const params = new URLSearchParams();

    // Filters
    filters.forEach(filter => {
        if (!filter.value) return;

        // Handle wildcards for 'like' and 'ilike' automatically if missing
        let val = filter.value;
        if ((filter.operator === 'like' || filter.operator === 'ilike') && !val.includes('*')) {
            val = `*${val}*`;
        }

        params.append(filter.column, `${filter.operator}.${val}`);
    });

    // Sort
    if (sort) {
        params.append('order', `${sort.column}.${sort.ascending ? 'asc' : 'desc'}`);
    }

    const queryString = params.toString();
    return queryString ? `&${queryString}` : ''; // Prepend & because we usually append to ?select=*
};

export const OPERATORS = [
    { label: 'equals', value: 'eq' },
    { label: 'not equal', value: 'neq' },
    { label: 'greater than', value: 'gt' },
    { label: 'less than', value: 'lt' },
    { label: 'greater or equal', value: 'gte' },
    { label: 'less or equal', value: 'lte' },
    { label: 'contains', value: 'ilike' }, // Case insensitive like
    { label: 'is', value: 'is' }, // For null
];
