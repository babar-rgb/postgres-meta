export class ApiError extends Error {
    status: number;
    statusText: string;

    constructor(status: number, statusText: string, message?: string) {
        super(message || `API Error: ${status} ${statusText}`);
        this.status = status;
        this.statusText = statusText;
        this.name = 'ApiError';
    }
}

// Helpers to get dynamic config
const getMetaUrl = () => (localStorage.getItem('nexus_meta_url') || 'http://localhost:8080').replace(/\/$/, "");
const getDataUrl = () => (localStorage.getItem('nexus_data_url') || 'http://localhost:3000').replace(/\/$/, "");
const getAuthToken = () => localStorage.getItem('nexus_auth_token');

// --- Electron Adapter Logic ---
const isElectron = () => {
    return typeof window !== 'undefined' && (window as any).electron;
};

// Map high-level actions to SQL queries for Electron (Direct DB Access)
const electronAdapter = {
    fetchTables: async () => {
        const sql = `
            SELECT 
                t.table_id as id, 
                t.relname as name, 
                n.nspname as schema,
                pg_size_pretty(pg_total_relation_size(t.oid)) as size,
                t.n_live_tup as live_rows_estimate 
            FROM pg_stat_user_tables t
            JOIN pg_namespace n ON n.oid = t.relid
            WHERE n.nspname = 'public'
            ORDER BY t.relname;
        `;
        const res = await (window as any).electron.query(sql);
        if (res.error) throw new Error(res.error);

        // Map to TableInfo format
        return res.rows.map((r: any) => ({
            id: r.id,
            schema: r.schema,
            name: r.name,
            bytes: 0, // Simplified for now
            live_rows_estimate: parseInt(r.live_rows_estimate || 0)
        }));
    },

    executeQuery: async (sql: string) => {
        const res = await (window as any).electron.query(sql);
        if (res.error) throw new Error(res.error);
        return res.rows;
    },

    fetchTableData: async (tableName: string, pageSize: number, offset: number, queryParams: string = '') => {
        // Construct SQL manually (Basic Filter/Sort support todo)
        // Warning: This is a basic implementation. 
        // Ideally we should parse queryParams or pass structured filters.
        // For now, let's just do pagination.

        // TODO: Parse 'queryParams' string (e.g. "?age=gt.10") into WHERE clause
        // Since queryParams is PostgREST specific syntax, this is hard to map 1:1 without a parser.
        // For phase 12 MVP, we accept that Filters might not work fully in Desktop mode yet without a parser.
        // For now, let's just do pagination.
        if (queryParams) console.warn('[Electron] Filtering not fully implemented yet', queryParams);

        const sql = `SELECT * FROM "${tableName}" LIMIT ${pageSize} OFFSET ${offset}`;
        const countSql = `SELECT count(*) as total FROM "${tableName}"`;

        const res = await (window as any).electron.query(sql);
        const countRes = await (window as any).electron.query(countSql);

        if (res.error) throw new Error(res.error);

        return {
            rows: res.rows,
            totalCount: parseInt(countRes.rows[0]?.total || 0)
        };
    },

    updateCell: async (tableName: string, rowId: any, column: string, value: any) => {
        // Assuming 'id' is PK. 
        const sql = `UPDATE "${tableName}" SET "${column}" = $1 WHERE id = $2`;
        const res = await (window as any).electron.query(sql, [value, rowId]);
        if (res.error) throw new Error(res.error);
        return { success: true };
    },

    deleteRows: async (tableName: string, ids: any[]) => {
        // Safe parameter expansion ($1, $2, $3...)
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const sql = `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`;
        const res = await (window as any).electron.query(sql, ids);
        if (res.error) throw new Error(res.error);
        return { success: true };
    }
}

// --- Original HTTP Logic ---

async function handleResponse<T>(response: Response, url: string): Promise<T> {
    if (!response.ok) {
        let message = response.statusText;
        try {
            const errBody = await response.json();
            if (errBody && errBody.message) message = errBody.message;
            else if (errBody && errBody.error) message = errBody.error;
        } catch (e) { /* Ignore */ }

        console.error(`[API Error] Request to ${url} failed with status ${response.status}: ${message}`);
        throw new ApiError(response.status, response.statusText, message);
    }
    if (response.status === 204) return {} as T;
    return response.json();
}

function getHeaders(extra?: Record<string, string>) {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// --- Main API Export ---
export const api = {
    fetchTables: async () => {
        if (isElectron()) return electronAdapter.fetchTables();

        const url = `${getMetaUrl()}/tables`;
        try {
            const res = await fetch(url, { headers: getHeaders() });
            return handleResponse<any[]>(res, url);
        } catch (err) {
            console.error(`[API] Network error fetching ${url}`, err);
            throw err;
        }
    },

    executeQuery: async (sql: string) => {
        if (isElectron()) return electronAdapter.executeQuery(sql);

        const url = `${getMetaUrl()}/query`;
        const res = await fetch(url, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ query: sql }) });
        return handleResponse<any[]>(res, url);
    },

    fetchTableData: async (tableName: string, pageSize: number, offset: number, queryParams: string = '') => {
        // Ideally we check isElectron here, but queryParams is problematic for SQL generation without parser.
        // For MVP Desktop, we might just load raw data.
        if (isElectron()) return electronAdapter.fetchTableData(tableName, pageSize, offset, queryParams);

        const url = `${getDataUrl()}/${tableName}?select=*&limit=${pageSize}&offset=${offset}${queryParams}`;
        const res = await fetch(url, { headers: getHeaders({ 'Prefer': 'count=exact' }) });

        if (!res.ok) return handleResponse(res, url);

        const countHeader = res.headers.get('content-range');
        let totalCount = 0;
        if (countHeader) {
            const parts = countHeader.split('/');
            if (parts.length === 2 && parts[1] !== '*') totalCount = parseInt(parts[1], 10);
        }
        const data = await res.json();
        return { rows: data, totalCount: totalCount || data.length };
    },

    updateCell: async (tableName: string, rowId: any, column: string, value: any) => {
        if (isElectron()) return electronAdapter.updateCell(tableName, rowId, column, value);

        const url = `${getDataUrl()}/${tableName}?id=eq.${rowId}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: getHeaders({ 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ [column]: value }),
        });
        return handleResponse(res, url);
    },

    deleteRows: async (tableName: string, ids: any[]) => {
        if (isElectron()) return electronAdapter.deleteRows(tableName, ids);

        const idString = ids.map(id => typeof id === 'string' ? `"${id}"` : id).join(',');
        const url = `${getDataUrl()}/${tableName}?id=in.(${idString})`;
        const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
        return handleResponse(res, url);
    }
};
