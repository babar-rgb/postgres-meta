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

async function handleResponse<T>(response: Response, url: string): Promise<T> {
    if (!response.ok) {
        let message = response.statusText;
        try {
            const errBody = await response.json();
            if (errBody && errBody.message) {
                message = errBody.message;
            } else if (errBody && errBody.error) {
                message = errBody.error;
            }
        } catch (e) {
            // Ignore
        }

        console.error(`[API Error] Request to ${url} failed with status ${response.status}: ${message}`);

        if (response.status === 404) throw new ApiError(404, 'Not Found', 'Resource not found');
        if (response.status === 401) throw new ApiError(401, 'Unauthorized', 'Authentication required');
        if (response.status === 403) throw new ApiError(403, 'Forbidden', 'Access denied');

        throw new ApiError(response.status, response.statusText, message);
    }

    if (response.status === 204) return {} as T;

    return response.json();
}

function getHeaders(extra?: Record<string, string>) {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extra
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export const api = {
    // Meta API
    fetchTables: async () => {
        const url = `${getMetaUrl()}/tables`;
        console.log(`[API] Fetching tables from ${url}`);
        try {
            const res = await fetch(url, { headers: getHeaders() });
            return handleResponse<any[]>(res, url);
        } catch (err) {
            console.error(`[API] Network error fetching ${url}`, err);
            throw err;
        }
    },

    executeQuery: async (sql: string) => {
        const url = `${getMetaUrl()}/query`;
        console.log(`[API] Executing query on ${url}: ${sql.substring(0, 50)}...`);
        const res = await fetch(url, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ query: sql }),
        });
        return handleResponse<any[]>(res, url);
    },

    // Data API (PostgREST)
    fetchTableData: async (tableName: string, pageSize: number, offset: number, queryParams: string = '') => {
        const url = `${getDataUrl()}/${tableName}?select=*&limit=${pageSize}&offset=${offset}${queryParams}`;
        console.log(`[API] Fetching data from ${url}`);

        const res = await fetch(
            url,
            { headers: getHeaders({ 'Prefer': 'count=exact' }) }
        );

        if (!res.ok) {
            return handleResponse(res, url);
        }

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
        const url = `${getDataUrl()}/${tableName}?id=eq.${rowId}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: getHeaders({ 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ [column]: value }),
        });
        return handleResponse(res, url);
    },

    deleteRows: async (tableName: string, ids: any[]) => {
        // Assuming 'id' is the PK.
        // We use in. operator: id=in.(1,2,3)
        const idString = ids.map(id => typeof id === 'string' ? `"${id}"` : id).join(',');
        const url = `${getDataUrl()}/${tableName}?id=in.(${idString})`;

        console.log(`[API] Deleting rows from ${url}`);
        const res = await fetch(url, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(res, url);
    }
};
