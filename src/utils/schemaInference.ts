import { ColumnDef } from './sqlGenerator';

/**
 * Infers PostgreSQL column types from a dataset.
 */
export function inferSchemaFromRows(rows: any[]): ColumnDef[] {
    if (!rows || rows.length === 0) return [];

    const keys = Object.keys(rows[0]);
    const columns: ColumnDef[] = [];

    for (const key of keys) {
        const type = inferColumnType(rows, key);
        columns.push({
            name: key,
            type: type,
            isPrimaryKey: key === 'id',
            isNullable: true,
            isIdentity: key === 'id' && type === 'int8', // Assume PK ID is identity
        });
    }

    return columns;
}

function inferColumnType(rows: any[], key: string): string {
    let isInt = true;
    let isFloat = true;
    let isBool = true;
    let isDate = true;
    let isUuid = true;
    let hasData = false;

    for (const row of rows) {
        const val = row[key];
        if (val === null || val === undefined || val === '') continue;
        hasData = true;

        const sVal = String(val).trim();

        // Check Int
        if (isInt && !/^-?\d+$/.test(sVal)) isInt = false;

        // Check Float
        if (isFloat && !/^-?\d*(\.\d+)?$/.test(sVal)) isFloat = false;

        // Check Bool
        if (isBool && !['true', 'false', '1', '0', 'yes', 'no'].includes(sVal.toLowerCase())) isBool = false;

        // Check Date (Simple ISO check or common formats)
        // Trying to be strict to avoid text being mistaken for date
        if (isDate) {
            const d = Date.parse(sVal);
            // Must be valid date AND look like a date string (has - or / or :)
            if (isNaN(d) || !sVal.match(/[-/:]/)) isDate = false;
        }

        // Check UUID
        if (isUuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sVal)) isUuid = false;

        // If everything failed, break early
        if (!isInt && !isFloat && !isBool && !isDate && !isUuid) return 'text';
    }

    if (!hasData) return 'text'; // Default to text if empty

    if (isUuid) return 'uuid';
    if (isInt) {
        // Check range? For now default to int8 for safety
        return 'int8';
    }
    if (isFloat) return 'numeric';
    if (isBool) return 'bool';
    if (isDate) return 'timestamptz';

    return 'text';
}
