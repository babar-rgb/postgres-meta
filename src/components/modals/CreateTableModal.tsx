import { useState } from 'react';
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { useSql } from '../../hooks/useSql'; // Assuming useSql is in ../../hooks/useSql
import { generateTableSQL, ColumnDef } from '../../utils/sqlGenerator';
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

    // Default columns: id and created_at
    const [columns, setColumns] = useState<ColumnDef[]>([
        { name: 'id', type: 'int8', isPrimaryKey: true, isNullable: false, isIdentity: true },
        { name: 'created_at', type: 'timestamptz', defaultValue: 'now()', isPrimaryKey: false, isNullable: false }
    ]);

    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

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
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['tables'] });
                    onClose();
                    // Reset form
                    setTableName('');
                    setColumns([
                        { name: 'id', type: 'int8', isPrimaryKey: true, isNullable: false, isIdentity: true },
                        { name: 'created_at', type: 'timestamptz', defaultValue: 'now()', isPrimaryKey: false, isNullable: false }
                    ]);
                },
                onError: (err) => {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                }
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid configuration');
        }
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
                            disabled={isPending || !tableName}
                            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>Save Table</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
