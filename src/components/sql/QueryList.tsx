import { useState } from 'react';
import { Play, Trash2, Clock, CheckCircle2, XCircle, Search, Save } from 'lucide-react';
import { useSqlStore } from '../../stores/useSqlStore';

interface QueryListProps {
    onLoadQuery: (sql: string) => void;
}

export default function QueryList({ onLoadQuery }: QueryListProps) {
    const [activeTab, setActiveTab] = useState<'saved' | 'history'>('saved');
    const { savedQueries, history, deleteSavedQuery, clearHistory } = useSqlStore();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSaved = savedQueries.filter(q => q.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Simple time formatter
    const timeAgo = (ts: number) => {
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60) return 'Just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-[#0C0C0C] border-l border-[#333] w-[300px]">
            {/* Tabs */}
            <div className="flex border-b border-[#333]">
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${activeTab === 'saved' ? 'text-white border-b-2 border-blue-500 bg-[#151515]' : 'text-subtle hover:text-white'}`}
                >
                    Saved ({savedQueries.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${activeTab === 'history' ? 'text-white border-b-2 border-orange-500 bg-[#151515]' : 'text-subtle hover:text-white'}`}
                >
                    History
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {activeTab === 'saved' ? (
                    <div className="space-y-3">
                        {/* Search */}
                        <div className="relative mb-4">
                            <Search size={14} className="absolute left-2 top-2 text-[#555]" />
                            <input
                                type="text"
                                placeholder="Search queries..."
                                className="w-full bg-[#111] border border-[#333] rounded pl-8 pr-2 py-1.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {filteredSaved.length === 0 ? (
                            <div className="text-center text-subtle text-xs py-8">
                                <Save size={24} className="mx-auto mb-2 opacity-50" />
                                <p>No saved queries yet.</p>
                                <p className="mt-1 opacity-70">Run a query and click "Save" to add one.</p>
                            </div>
                        ) : (
                            filteredSaved.map(q => (
                                <div key={q.id} className="group bg-[#151515] border border-[#222] rounded p-3 hover:border-blue-500/50 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-white text-xs truncate max-w-[150px]" title={q.name}>{q.name}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onLoadQuery(q.sql)}
                                                className="p-1 hover:bg-blue-500/20 text-blue-400 rounded"
                                                title="Load into Editor"
                                            >
                                                <Play size={12} />
                                            </button>
                                            <button
                                                onClick={() => deleteSavedQuery(q.id)}
                                                className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-500 bg-[#000] p-2 rounded line-clamp-2">
                                        {q.sql}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-subtle">Recent Executions</span>
                            {history.length > 0 && (
                                <button onClick={clearHistory} className="text-[10px] text-red-500 hover:text-red-400">Clear</button>
                            )}
                        </div>
                        {history.length === 0 ? (
                            <div className="text-center text-subtle text-xs py-8">
                                <Clock size={24} className="mx-auto mb-2 opacity-50" />
                                <p>History is empty.</p>
                            </div>
                        ) : (
                            history.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => onLoadQuery(item.sql)}
                                    className="bg-[#151515] border border-[#222] rounded p-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors relative pl-3"
                                >
                                    {/* Status Indicator Line */}
                                    <div className={`absolute top-0 bottom-0 left-0 w-[3px] rounded-l ${item.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />

                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            {item.status === 'success' ? <CheckCircle2 size={10} className="text-green-500" /> : <XCircle size={10} className="text-red-500" />}
                                            <span className="text-[10px] text-zinc-500">{timeAgo(item.timestamp)}</span>
                                        </div>
                                        {item.durationMs && <span className="text-[10px] text-zinc-600 font-mono">{item.durationMs}ms</span>}
                                    </div>
                                    <div className="text-[11px] font-mono text-zinc-300 line-clamp-2">
                                        {item.sql}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
