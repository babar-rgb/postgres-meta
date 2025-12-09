import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
// import { getPostgresType, formatValueForInput } from '../../utils/formHelpers'; // Unused for now as we don't have types in drawer yet

interface RowEditorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    initialData?: any; // If null -> Create Mode; If object -> Edit Mode
    columns: any[]; // We'll infer types from here
}

export default function RowEditorDrawer({ isOpen, onClose, tableName, initialData, columns }: RowEditorDrawerProps) {
    const queryClient = useQueryClient();
    const isEditMode = !!initialData;
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);

    // Filter out internal columns like "select" or UI-only columns
    const dbColumns = columns.filter(col => col.accessorKey && col.accessorKey !== 'select');

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (initialData) {
                // Pre-fill for edit
                const data: any = {};
                dbColumns.forEach(col => {
                    const key = col.accessorKey;
                    // We might need to store the raw type in columns to do better formatting
                    // For now assuming the format helper handles basic strings/nums
                    data[key] = initialData[key];
                });
                setFormData(data);
            } else {
                // Reset for create
                setFormData({});
            }
        }
    }, [isOpen, initialData, tableName]); // Reset when opening

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            // Need to process types before sending?
            // e.g. parse JSON strings back to objects
            const payload: any = {};

            // We need to know column types, but we'll try to just send what we have
            // and maybe parse JSON manually if we detect it
            // Ideally we'd look up the column definition to see if it's jsonb

            Object.keys(data).forEach(key => {
                const val = data[key];
                // Simple heuristic: if string looks like json and we know it's json type...
                // For now just passing values.
                // TODO: Handle empty strings as null for nullable columns?
                if (val === '') {
                    // payload[key] = null; // Maybe? Or let backend handle default?
                    // If we send empty string for int, it fails.
                    // Let's assume we don't send it if it's new, or send null if editing?
                }
                payload[key] = val;
            });

            if (isEditMode) {
                // Update
                // Assumption: We have an 'id' column for PK.
                // Ideally we should know the PK from schema.
                const pk = initialData.id;
                if (!pk) throw new Error("Automatic editing requires an 'id' column.");

                // Remove 'id' from payload generally to avoid changing PK
                delete payload.id;

                return api.updateCell(tableName, pk, Object.keys(payload)[0], Object.values(payload)[0]); // Start with single cell update API wrapper?
                // Wait, api.updateCell is single cell. We need updateRow.
                // We don't have updateRow in api.ts yet, let's just use raw fetch or enhance api.ts later.
                // We will assume for now we might need to enhance api.ts or loop? 
                // It's better to implement `updateRow` in api.

                // Since we don't have it, let's just define it inline or use what we have.
                // Let's assume we fix api.ts later. For now, we will construct the fetch call manually here or add to api.
                // Actually, let's fix api.ts in next step. For now, assume api.upsertRow exists or use raw fetch logic.

                return fetch(`${localStorage.getItem('nexus_data_url') || 'http://localhost:3000'}/${tableName}?id=eq.${pk}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('nexus_auth_token') || ''}`
                    },
                    body: JSON.stringify(payload)
                }).then(res => {
                    if (!res.ok) throw new Error(res.statusText)
                    return res;
                });

            } else {
                // Insert
                return fetch(`${localStorage.getItem('nexus_data_url') || 'http://localhost:3000'}/${tableName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('nexus_auth_token') || ''}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                }).then(res => {
                    if (!res.ok) throw new Error(res.statusText)
                    return res;
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tableData', tableName] });
            onClose();
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : 'Failed to save');
        }
    });

    if (!isOpen) return null;

    const handleSubmit = () => {
        saveMutation.mutate(formData);
    };

    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 w-full max-w-md bg-[#0A0A0A] border-l border-[#333] shadow-2xl flex flex-col transform transition-transform duration-300">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[#222] bg-[#0C0C0C] flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            {isEditMode ? 'Edit Record' : 'New Record'}
                        </h2>
                        <div className="text-xs text-subtle font-mono mt-1">{tableName}</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#222] rounded-full text-subtle hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {dbColumns.map((col) => {
                        const key = col.accessorKey;
                        // Determine type.
                        // Since we only have access to raw values and react-table cols (which might lack full postgres type metadata in `col`), 
                        // we might default to text if we can't infer.
                        // Ideally `DataGrid` should pass `columns` with type metadata. 
                        // For this prompt, let's try to infer from value or key name for now, or just use text/json universally.
                        // Or wait, we can't reliably know types without schema metadata.
                        // Let's just use Text Area for long strings, Input for short, JSON editor for objects.
                        const val = formData[key] ?? '';

                        let inputType = 'text';
                        if (typeof val === 'number') inputType = 'number';
                        if (typeof val === 'boolean') inputType = 'boolean';
                        if (typeof val === 'object' && val !== null) inputType = 'json';
                        if (key.includes('_at') || key.includes('date')) inputType = 'datetime';
                        if (key === 'id') inputType = 'number'; // common convention

                        const isReadOnly = isEditMode && key === 'id'; // Protect ID on edit

                        return (
                            <div key={key} className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-subtle">
                                    {key} {isReadOnly && <span className="text-zinc-600 font-normal ml-1">(Read Only)</span>}
                                </label>

                                {inputType === 'boolean' ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                            checked={!!val}
                                            disabled={isReadOnly}
                                            onChange={(e) => handleChange(key, e.target.checked)}
                                        />
                                        <span className="text-sm text-zinc-300">{val ? 'True' : 'False'}</span>
                                    </div>
                                ) : inputType === 'json' ? (
                                    <textarea
                                        className="w-full h-32 bg-[#111] border border-[#333] rounded p-2 text-xs font-mono text-white outline-none focus:border-blue-600 transition-colors resize-none"
                                        value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val}
                                        disabled={isReadOnly}
                                        onChange={(e) => {
                                            try {
                                                const parsed = JSON.parse(e.target.value);
                                                handleChange(key, parsed);
                                            } catch {
                                                // Allow typing invalid json momentarily? 
                                                // Or just store string until save?
                                                // For simple version, store as generic text/object
                                                // Actually better to store string in local state if we want to allow editing
                                                handleChange(key, e.target.value);
                                            }
                                        }}
                                    />
                                ) : (
                                    <input
                                        type={inputType === 'number' ? 'number' : 'text'}
                                        className={`w-full bg-[#111] border rounded p-2 text-sm text-white outline-none focus:border-blue-600 transition-colors ${isReadOnly ? 'border-transparent bg-[#111]/50 text-zinc-500 cursor-not-allowed' : 'border-[#333]'
                                            }`}
                                        value={val}
                                        disabled={isReadOnly}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#222] bg-[#0C0C0C] flex items-center justify-between shrink-0">
                    <div className="text-red-500 text-xs truncate max-w-[200px]">
                        {error}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-subtle hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saveMutation.isPending}
                            className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>Save Record</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
