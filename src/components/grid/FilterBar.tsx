
import { useState, useRef, useEffect } from 'react';
import { Filter, SortAsc, SortDesc, X, Trash2, ArrowUpDown } from 'lucide-react';
import { FilterState, SortState, OPERATORS } from '../../lib/postgrest';

interface FilterBarProps {
    filters: FilterState[];
    setFilters: (filters: FilterState[]) => void;
    sort: SortState | null;
    setSort: (sort: SortState | null) => void;
    columns: string[];
    selectedCount: number;
    onDeleteSelected: () => void;
}

export default function FilterBar({ filters, setFilters, sort, setSort, columns, selectedCount, onDeleteSelected }: FilterBarProps) {
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    // New Filter State
    const [newFilterCol, setNewFilterCol] = useState(columns[0] || '');
    const [newFilterOp, setNewFilterOp] = useState('eq');
    const [newFilterVal, setNewFilterVal] = useState('');

    const filterMenuRef = useRef<HTMLDivElement>(null);
    const sortMenuRef = useRef<HTMLDivElement>(null);

    // Close menus on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
            }
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
                setIsSortMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const addFilter = () => {
        if (!newFilterVal) return;
        setFilters([...filters, { column: newFilterCol, operator: newFilterOp, value: newFilterVal }]);
        setNewFilterVal('');
        setIsFilterMenuOpen(false);
    };

    const removeFilter = (index: number) => {
        const newFilters = [...filters];
        newFilters.splice(index, 1);
        setFilters(newFilters);
    };

    return (
        <div className="h-12 border-b border-border bg-[#0C0C0C] flex items-center justify-between px-4 shrink-0 z-20 relative">

            {/* Left: Filters */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient-right flex-1 mr-4">

                {/* Filter Button */}
                <div className="relative" ref={filterMenuRef}>
                    <button
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${filters.length > 0 ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-[#151515] text-subtle border-[#222] hover:text-white'}`}
                    >
                        <Filter size={14} />
                        <span>Filter</span>
                        {filters.length > 0 && <span className="bg-blue-500 text-white text-[9px] px-1 rounded-full">{filters.length}</span>}
                    </button>

                    {/* Filter Dropdown */}
                    {isFilterMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-[300px] bg-[#111] border border-[#333] rounded-lg shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="text-xs font-semibold text-subtle mb-3 uppercase tracking-wider">Add Filter</div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-zinc-500 mb-1 block">Column</label>
                                    <select
                                        className="w-full bg-[#000] border border-[#333] rounded p-1.5 text-xs text-white outline-none"
                                        value={newFilterCol}
                                        onChange={e => setNewFilterCol(e.target.value)}
                                    >
                                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <label className="text-[10px] text-zinc-500 mb-1 block">Operator</label>
                                        <select
                                            className="w-full bg-[#000] border border-[#333] rounded p-1.5 text-xs text-white outline-none"
                                            value={newFilterOp}
                                            onChange={e => setNewFilterOp(e.target.value)}
                                        >
                                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-zinc-500 mb-1 block">Value</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            className="w-full bg-[#000] border border-[#333] rounded p-1.5 text-xs text-white outline-none placeholder-zinc-700"
                                            placeholder="Value..."
                                            value={newFilterVal}
                                            onChange={e => setNewFilterVal(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addFilter()}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={addFilter}
                                    className="w-full bg-blue-700 hover:bg-blue-600 text-white py-1.5 rounded text-xs font-medium transition-colors"
                                >
                                    Apply Filter
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Active Filters */}
                {filters.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 pl-2 pr-1 py-1 rounded bg-[#1a1a1a] border border-[#333] text-xs text-zinc-300 whitespace-nowrap">
                        <span className="font-mono text-blue-400">{f.column}</span>
                        <span className="text-zinc-500">{f.operator}</span>
                        <span className="font-medium text-white max-w-[100px] truncate">"{f.value}"</span>
                        <button onClick={() => removeFilter(i)} className="p-0.5 hover:bg-[#333] rounded text-zinc-500 hover:text-white ml-1">
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Right: Sort & Actions */}
            <div className="flex items-center gap-3">
                {/* Selection Actions */}
                {selectedCount > 0 && (
                    <button
                        onClick={onDeleteSelected}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded text-xs font-medium transition-colors animate-in fade-in zoom-in"
                    >
                        <Trash2 size={14} />
                        <span>Delete ({selectedCount})</span>
                    </button>
                )}

                <div className="h-4 w-px bg-[#333]" />

                {/* Sort */}
                <div className="relative" ref={sortMenuRef}>
                    <button
                        onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${sort ? 'text-accent' : 'text-subtle hover:text-white'}`}
                    >
                        {sort ? (
                            sort.ascending ? <SortAsc size={14} /> : <SortDesc size={14} />
                        ) : <ArrowUpDown size={14} />}
                        <span>{sort ? sort.column : 'Sort'}</span>
                    </button>

                    {isSortMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-[200px] bg-[#111] border border-[#333] rounded-lg shadow-xl py-1 z-50">
                            <div className="text-[10px] font-semibold text-subtle px-3 py-2 uppercase tracking-wider bg-[#151515]">Sort By</div>
                            <div className="max-h-[200px] overflow-auto">
                                {columns.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => {
                                            // Toggle direction if same col, else default asc
                                            if (sort?.column === c) {
                                                setSort({ column: c, ascending: !sort.ascending });
                                            } else {
                                                setSort({ column: c, ascending: true });
                                            }
                                            setIsSortMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#222] ${sort?.column === c ? 'text-blue-400 bg-blue-900/10' : 'text-zinc-400'}`}
                                    >
                                        <span>{c}</span>
                                        {sort?.column === c && (
                                            sort.ascending ? <SortAsc size={12} /> : <SortDesc size={12} />
                                        )}
                                    </button>
                                ))}
                            </div>
                            {sort && (
                                <button
                                    onClick={() => { setSort(null); setIsSortMenuOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#222] border-t border-[#222]"
                                >
                                    Clear Sort
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
