
export const getPostgresType = (pgType: string): 'text' | 'number' | 'boolean' | 'datetime' | 'json' => {
    const type = pgType.toLowerCase();

    if (['int2', 'int4', 'int8', 'float4', 'float8', 'numeric', 'serial', 'bigserial'].some(t => type.includes(t))) {
        return 'number';
    }

    if (['bool', 'boolean'].includes(type)) {
        return 'boolean';
    }

    if (['json', 'jsonb'].includes(type)) {
        return 'json';
    }

    if (['timestamp', 'timestamptz', 'date', 'time'].some(t => type.includes(t))) {
        return 'datetime';
    }

    return 'text';
};

export const formatValueForInput = (value: any, type: string) => {
    if (value === null || value === undefined) return '';

    const inputType = getPostgresType(type);

    if (inputType === 'datetime') {
        // Simple hack to format for input type="datetime-local" which expects YYYY-MM-DDThh:mm
        // Ideally use date-fns or similar
        try {
            return new Date(value).toISOString().slice(0, 16);
        } catch {
            return value;
        }
    }

    if (inputType === 'json') {
        return typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
    }

    return value;
};
