export interface ColDef {
    name: string;
    type: string;
}

const getBaseUrl = () => {
    return localStorage.getItem('nexus_data_url') || 'http://localhost:3000';
};

const mockValue = (type: string) => {
    if (type.includes('int') || type.includes('numeric')) return 0;
    if (type.includes('bool')) return true;
    if (type.includes('json')) return {};
    if (type.includes('timestamp') || type.includes('date')) return new Date().toISOString();
    return "string";
};

export const generateSnippets = (tableName: string, columns: ColDef[]) => {
    const baseUrl = getBaseUrl();
    const mockObj = columns.reduce((acc, col) => {
        if (col.name === 'id' || col.name === 'created_at') return acc; // Skip auto fields for insert example
        acc[col.name] = mockValue(col.type);
        return acc;
    }, {} as any);

    const mockJson = JSON.stringify(mockObj, null, 2);

    return {
        js: {
            read: `
// Install: npm install @supabase/supabase-js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('${baseUrl}', 'anon-key')

const { data, error } = await supabase
  .from('${tableName}')
  .select('*')
            `.trim(),
            insert: `
const { data, error } = await supabase
  .from('${tableName}')
  .insert([
${mockJson.replace(/^/gm, '    ')}
  ])
            `.trim(),
            update: `
const { data, error } = await supabase
  .from('${tableName}')
  .update({ some_column: 'new_value' })
  .eq('id', 1)
            `.trim(),
            delete: `
const { data, error } = await supabase
  .from('${tableName}')
  .delete()
  .eq('id', 1)
            `.trim()
        },
        curl: {
            read: `curl -X GET '${baseUrl}/${tableName}'`,
            insert: `
curl -X POST '${baseUrl}/${tableName}' \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(mockObj)}'
            `.trim(),
            filter: `curl -X GET '${baseUrl}/${tableName}?id=eq.1'`
        },
        sql: {
            read: `SELECT * FROM public.${tableName};`,
            insert: `
INSERT INTO public.${tableName} (${Object.keys(mockObj).join(', ')})
VALUES (${Object.values(mockObj).map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')});
            `.trim()
        }
    };
};
