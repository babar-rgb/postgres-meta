import { useState, useMemo, useEffect } from 'react';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { useUpdateCell } from '../hooks/useDb';
import { useTableData } from '../hooks/useTableData'; // Updated import
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, Lock, CheckSquare, Square, FileCode, Plus, Pencil } from 'lucide-react';
import ApiDocsDrawer from './ApiDocsDrawer';
import RowEditorDrawer from './drawers/RowEditorDrawer';
import FilterBar from './grid/FilterBar';
import { FilterState, SortState } from '../lib/postgrest';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface DataGridProps {
    tableName: string;
}

// Editable Cell - Styled for Supabase look
const EditableCell = ({ getValue, row, column, table }: any) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);
    const meta = table.options.meta;
    const isId = column.id === 'id' || column.id.endsWith('_id');

    const onBlur = () => {
        setIsEditing(false);
        if (value !== initialValue) {
            meta?.updateData(row.original.id, column.id, value);
        }
    };

    // If it's an ID or specialized field, don't allow simple edit for now or style differently
    if (isId) {
        return <span className="font-mono text-zinc-500 select-all">{initialValue}</span>;
    }

    if (isEditing) {
        return (
            <input
                value={value as string}
                onChange={(e) => setValue(e.target.value)}
                onBlur={onBlur}
                autoFocus
                className="w-full bg-black text-white p-1 border-none outline-none ring-1 ring-blue-500 rounded-sm"
            />
        );
    }

    return (
        <div
            onDoubleClick={() => setIsEditing(true)}
            className="cursor-text min-h-[20px] truncate"
            title={String(initialValue)}
        >
            {value === null ? <span className="text-zinc-600 italic">NULL</span> : String(value)}
        </div>
    );
};


export default function DataGrid({ tableName }: DataGridProps) {
    const queryClient = useQueryClient();
    const [pageIndex, setPageIndex] = useState(0);
    const pageSize = 100;

    // Filter & Sort State
    const [filters, setFilters] = useState<FilterState[]>([]);
    const [sort, setSort] = useState<SortState | null>(null);

    // Using new hook
    const { data, isLoading, error, refetch } = useTableData({ tableName, pageSize, pageIndex, filters, sort });

    const { mutate: updateCell } = useUpdateCell();
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Drawers State
    const [isApiDrawerOpen, setIsApiDrawerOpen] = useState(false);
    const [isRowEditorOpen, setIsRowEditorOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<any>(null); // If null -> Create Mode

    // Reset page when table changes
    useEffect(() => {
        setPageIndex(0);
        setRowSelection({});
        setFilters([]);
        setSort(null);
    }, [tableName]);

    // Dynamic Columns Generation
    const dynamicCols = useMemo<ColumnDef<any>[]>(() => {
        if (!data?.rows || data.rows.length === 0) return [];
        const firstRow = data.rows[0];

        return Object.keys(firstRow).map((key) => ({
            accessorKey: key,
            header: key,
            cell: EditableCell,
        }));
    }, [data?.rows]);

    // Checkbox Column + Action Column
    const columns = useMemo(() => {
        const selectColumn: ColumnDef<any> = {
            id: 'select',
            header: ({ table }) => (
                <div
                    className="flex items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                    onClick={table.getToggleAllRowsSelectedHandler()}
                >
                    {table.getIsAllRowsSelected() ? <CheckSquare size={14} className="text-accent" /> : <Square size={14} />}
                </div>
            ),
            cell: ({ row }) => (
                <div
                    className="flex items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                    onClick={row.getToggleSelectedHandler()}
                >
                    {row.getIsSelected() ? <CheckSquare size={14} className="text-accent" /> : <Square size={14} />}
                </div>
            ),
            size: 40,
        };

        const actionColumn: ColumnDef<any> = {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <button
                    onClick={() => {
                        setEditingRow(row.original);
                        setIsRowEditorOpen(true);
                    }}
                    className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Edit Row"
                >
                    <Pencil size={12} />
                </button>
            ),
            size: 30
        };

        const baseCols = dynamicCols.length ? [selectColumn, ...dynamicCols] : [selectColumn];
        return [...baseCols, actionColumn];
    }, [dynamicCols]);

    const table = useReactTable({
        data: data?.rows || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: { rowSelection },
        onRowSelectionChange: setRowSelection,
        manualPagination: true,
        pageCount: Math.ceil((data?.totalCount || 0) / pageSize),
        getRowId: row => row.id || row.uuid || JSON.stringify(row), // Try to stick to ID
        meta: {
            updateData: (rowIndex: any, columnId: string, value: any) => {
                updateCell({ tableName, rowId: rowIndex, column: columnId, value });
            }
        }
    });

    const handleCreateRow = () => {
        setEditingRow(null); // Create mode
        setIsRowEditorOpen(true);
    };

    const handleDeleteSelected = async () => {
        const selectedIds = Object.keys(rowSelection);
        if (selectedIds.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedIds.length} rows?`)) return;

        try {
            await api.deleteRows(tableName, selectedIds);
            setRowSelection({});
            queryClient.invalidateQueries({ queryKey: ['tableData', tableName] });
        } catch (err) {
            alert('Failed to delete rows: ' + err);
        }
    };

    if (isLoading) return (
        <div className="h-full flex flex-col items-center justify-center text-subtle space-y-4">
            <Loader2 size={32} className="animate-spin text-accent" />
            <p>Loading {tableName}...</p>
        </div>
    );

    if (error) {
        const isRLSError = error.message.includes('403') || error.message.includes('permission denied');
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-red-500/10 p-6 rounded-lg border border-red-500/20 max-w-md">
                    {isRLSError ? <Lock size={48} className="mx-auto text-red-500 mb-4" /> : <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />}
                    <h3 className="text-lg font-semibold text-white mb-2">{isRLSError ? 'Access Denied (RLS)' : 'Error Loading Table'}</h3>
                    <p className="text-subtle mb-4 text-sm">{error.message}</p>
                    <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-[#0A0A0A]">
            {/* Header Toolbar */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-[#0C0C0C] shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-semibold text-white">{tableName}</h1>
                    <span className="text-xs text-subtle px-2 py-0.5 bg-[#222] rounded-full">{data?.totalCount} rows</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreateRow}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] text-white border border-[#333] rounded text-xs font-medium transition-all"
                    >
                        <Plus size={14} />
                        <span>Insert Row</span>
                    </button>

                    <button
                        onClick={() => setIsApiDrawerOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#0A4432] hover:bg-[#0D5F45] text-[#4ADE80] border border-[#10B981]/20 rounded text-xs font-medium transition-all"
                    >
                        <FileCode size={14} />
                        <span>API Docs</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <FilterBar
                filters={filters}
                setFilters={setFilters}
                sort={sort}
                setSort={setSort}
                columns={dynamicCols.map(c => (c as any).accessorKey)}
                selectedCount={Object.keys(rowSelection).length}
                onDeleteSelected={handleDeleteSelected}
            />

            {/* Grid */}
            <div className="flex-1 overflow-auto relative">
                {(!data?.rows || data.rows.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-subtle">
                        <p>No records found in this table.</p>
                        {filters.length > 0 ? (
                            <button onClick={() => setFilters([])} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-xs">Clear Filters</button>
                        ) : (
                            <button onClick={handleCreateRow} className="mt-4 px-4 py-2 bg-[#222] hover:bg-[#333] text-white rounded text-xs font-medium transition-colors">
                                Insert First Record
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead className="sticky top-0 bg-[#0C0C0C] z-10 shadow-sm border-b border-[#222]">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="font-medium text-subtle p-0.5 whitespace-nowrap bg-[#0C0C0C]">
                                            <div className="px-3 py-2 border-r border-[#222] h-full flex items-center">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className={`border-b border-[#151515] hover:bg-white/[0.03] transition-colors h-[40px] group ${row.getIsSelected() ? 'bg-blue-900/10' : ''}`}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="p-0 whitespace-nowrap text-zinc-300 border-r border-[#1a1a1a] last:border-r-0 max-w-[300px] overflow-hidden text-ellipsis">
                                            <div className="px-3 py-1.5 overflow-hidden text-ellipsis">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer Pagination */}
            <div className="h-10 border-t border-border flex items-center justify-between px-4 bg-[#0C0C0C] text-xs shrink-0">
                <div className="flex items-center gap-4 text-subtle">
                    <span>{Object.keys(rowSelection).length} selected</span>
                    <span>Page {pageIndex + 1} of {Math.ceil((data?.totalCount || 0) / pageSize)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                        disabled={pageIndex === 0}
                        className="p-1 hover:bg-[#222] rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => setPageIndex(p => p + 1)}
                        disabled={pageIndex >= Math.ceil((data?.totalCount || 0) / pageSize) - 1}
                        className="p-1 hover:bg-[#222] rounded disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <ApiDocsDrawer
                isOpen={isApiDrawerOpen}
                onClose={() => setIsApiDrawerOpen(false)}
                tableName={tableName}
                columns={dynamicCols}
            />

            <RowEditorDrawer
                isOpen={isRowEditorOpen}
                onClose={() => setIsRowEditorOpen(false)}
                tableName={tableName}
                initialData={editingRow}
                columns={dynamicCols} // Pass cols to infer types
            />
        </div>
    );
}
