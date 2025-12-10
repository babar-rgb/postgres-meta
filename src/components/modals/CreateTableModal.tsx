import { useState } from 'react';
import { X, Plus, Trash2, Loader2, Save, Upload, FileSpreadsheet, Wand2 } from 'lucide-react';
import { useSql } from '../../hooks/useSql';
import { generateTableSQL, ColumnDef } from '../../utils/sqlGenerator';
import { inferSchemaFromRows } from '../../utils/schemaInference';
import { parseCsv } from '../../utils/csvHelpers';
import { api } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const POSTGRES_TYPES = [
    'int8', // Bigint
    'text',
    'bool',
    'uuid',
    'timestamptz',
    'jsonb',
    'int4',
    'numeric',
    'date'
];

export default function CreateTableModal({ isOpen, onClose }: CreateTableModalProps) {
    const queryClient = useQueryClient();
    const { mutate: executeSql, isPending } = useSql();

    const [tableName, setTableName] = useState('');
    const [enableRLS, setEnableRLS] = useState(true);

    const [columns, setColumns] = useState<ColumnDef[]>([
        { name: 'id', type: 'int8', isPrimaryKey: true, isNullable: false, isIdentity: true },
        { name: 'created_at', type: 'timestamptz', defaultValue: 'now()', isPrimaryKey: false, isNullable: false }
    ]);

    // CSV Import State
    const [importData, setImportData] = useState<any[] | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImportingData, setIsImportingData] = useState(false);

    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError(null);
        try {
            // 1. Parse CSV
            const data = await parseCsv(file);
            if (data.length === 0) throw new Error("CSV is empty");

            // 2. Infer Schema
            const inferredUserColumns = inferSchemaFromRows(data);

            // 3. Merge with default columns (id, created_at) if they don't exist in CSV
            // Ideally we keep the CSV structure as primary.
            // Let's replace the whole schema with inferred one, but ensure ID exists if possible?
            // Actually, Supabase usually ADDs id and created_at. Let's keep them but deduplicate.

            const reserved = ['id', 'created_at'];
            const finalColumns = [
                { name: 'id', type: 'int8', isPrimaryKey: true, isNullable: false, isIdentity: true },
                { name: 'created_at', type: 'timestamptz', defaultValue: 'now()', isPrimaryKey: false, isNullable: false },
                ...inferredUserColumns.filter(c => !reserved.includes(c.name))
            ];

            setColumns(finalColumns);
            setImportData(data); // Store data for later insertion

            // Auto-guess table name from filename
            const cleanName = file.name.replace('.csv', '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            setTableName(cleanName);

        } catch (err: any) {
            setError(err.message || "Failed to parse CSV");
        } finally {
            setIsParsing(false);
        }
    };

    const handleAddColumn = () => {
        setColumns([...columns, { name: '', type: 'text', isPrimaryKey: false, isNullable: true }]);
    };

    const handleRemoveColumn = (index: number) => {
        const newCols = [...columns];
        newCols.splice(index, 1);
        setColumns(newCols);
    };

    const updateColumn = (index: number, field: keyof ColumnDef, value: any) => {
        const newCols = [...columns];
        newCols[index] = { ...newCols[index], [field]: value };
        setColumns(newCols);
    };

    const handleSubmit = () => {
        setError(null);
        try {
            const sql = generateTableSQL({
                name: tableName,
                columns,
                enableRLS,
                realtime: false
            });

            executeSql(sql, {
                onSuccess: async () => {
                    // If we have data to import, do it now!
                    if (importData && importData.length > 0) {
                        setIsImportingData(true);
                        try {
                            // We need to sanitize data to match column types?
                            // Postgres is somewhat lenient with string->type coercion if format is correct.
                            // CSV helper unparses empty strings to null? No, we might need to do that.
                            const sanitized = importData.map(row => {
                                const newRow: any = {};
                                Object.keys(row).forEach(k => {
                                    // Skip columns not in schema?
                                    // Or ensure keys match column names. 
                                    // Note: inferSchemaFromRows uses exact CSV keys.
                                    if (row[k] === '') newRow[k] = null;
                                    else newRow[k] = row[k];
                                });
                                return newRow;
                            });

                            await api.insertRows(tableName, sanitized);
                        } catch (importErr: any) {
                            console.error("Import failed after create", importErr);
                            setError("Table created, but data import failed: " + importErr.message);
                            setIsImportingData(false);
                            queryClient.invalidateQueries({ queryKey: ['tables'] });
                            return; // Don't close if import failed, let user see error
                        }
                        setIsImportingData(false);
                    }

                    queryClient.invalidateQueries({ queryKey: ['tables'] });
                    onClose();
                    resetForm();
                },
                onError: (err) => {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                }
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid configuration');
        }
    };

    const resetForm = () => {
        setTableName('');
        setColumns([
            { name: 'id', type: 'int8', isPrimaryKey: true, isNullable: false, isIdentity: true },
            { name: 'created_at', type: 'timestamptz', defaultValue: 'now()', isPrimaryKey: false, isNullable: false }
        ]);
        setImportData(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0A0A0A] border border-border w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-[#0C0C0C]">
                    <h2 className="text-lg font-semibold text-white">Create New Table</h2>
                    <button onClick={onClose} className="text-subtle hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6 space-y-6">

                    {/* CSV Upload Section */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Wand2 size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">Magic Import</h3>
                                <p className="text-xs text-subtle">Upload a CSV to auto-generate columns and import data.</p>
                            </div>
                        </div>
                        <div>
                            <input
                                type="file"
                                id="csv-create-upload"
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileUpload}
                                disabled={isParsing}
                            />
                            <label
                                htmlFor="csv-create-upload"
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded cursor-pointer transition-colors flex items-center gap-2"
                            >
                                {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {isParsing ? 'Analyzing...' : 'Upload CSV'}
                            </label>
                        </div>
                    </div>

                    {importData && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                            <FileSpreadsheet size={14} />
                            <span>Loaded <b>{importData.length} rows</b>. Columns auto-generated from CSV headers.</span>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-subtle mb-2">Name</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. todos"
                                className="w-full bg-[#111] border border-border rounded p-2 text-white outline-none focus:border-blue-600 transition-colors"
                                value={tableName}
                                onChange={e => setTableName(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="rls"
                                checked={enableRLS}
                                onChange={e => setEnableRLS(e.target.checked)}
                                className="accent-blue-600"
                            />
                            <label htmlFor="rls" className="text-sm text-subtle select-none cursor-pointer">Enable Row Level Security (RLS)</label>
                        </div>
                    </div>

                    {/* Columns */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">Columns</h3>
                        </div>

                        <div className="space-y-2">
                            {columns.map((col, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-3 bg-[#111] border border-border rounded group hover:border-[#333] transition-colors">
                                    {/* Name */}
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Column Name"
                                            className="w-full bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
                                            value={col.name}
                                            onChange={e => updateColumn(idx, 'name', e.target.value)}
                                        />
                                    </div>

                                    {/* Type */}
                                    <div className="w-32">
                                        <select
                                            className="w-full bg-transparent text-sm text-subtle outline-none cursor-pointer hover:text-white"
                                            value={col.type}
                                            onChange={e => updateColumn(idx, 'type', e.target.value)}
                                        >
                                            {POSTGRES_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* Default */}
                                    <div className="w-32">
                                        <input
                                            type="text"
                                            placeholder="NULL"
                                            className="w-full bg-transparent text-sm text-subtle placeholder-zinc-700 outline-none"
                                            value={col.defaultValue || ''}
                                            onChange={e => updateColumn(idx, 'defaultValue', e.target.value)}
                                            title="Default Value"
                                        />
                                    </div>

                                    {/* Settings */}
                                    <div className="flex items-center gap-3 pt-0.5">
                                        <div className="flex items-center gap-1" title="Primary Key">
                                            <span className={`text-[10px] uppercase font-bold ${col.isPrimaryKey ? 'text-blue-500' : 'text-zinc-700'}`}>PK</span>
                                            <input
                                                type="checkbox"
                                                checked={col.isPrimaryKey}
                                                onChange={e => updateColumn(idx, 'isPrimaryKey', e.target.checked)}
                                                className="accent-blue-600"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1" title="Nullable">
                                            <span className={`text-[10px] uppercase font-bold ${col.isNullable ? 'text-zinc-400' : 'text-zinc-700'}`}>NULL</span>
                                            <input
                                                type="checkbox"
                                                checked={col.isNullable}
                                                onChange={e => updateColumn(idx, 'isNullable', e.target.checked)}
                                                className="accent-zinc-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        onClick={() => handleRemoveColumn(idx)}
                                        className="text-zinc-700 hover:text-red-500 transition-colors pt-0.5 ml-2"
                                        title="Remove Column"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleAddColumn}
                            className="mt-2 text-xs flex items-center gap-1 text-blue-500 hover:text-blue-400 font-medium px-2 py-1 rounded hover:bg-blue-500/10 transition-colors"
                        >
                            <Plus size={14} />
                            <span>Add Column</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-[#0C0C0C] flex items-center justify-between">
                    <div className="text-red-500 text-xs font-mono truncate max-w-[400px]">
                        {error}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-subtle hover:text-white transition-colors">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isPending || isImportingData || !tableName}
                            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {(isPending || isImportingData) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>{isImportingData ? 'Importing Data...' : 'Save Table'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
