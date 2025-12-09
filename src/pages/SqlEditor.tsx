import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, AlertTriangle, Terminal, Save } from 'lucide-react';
import { useSql } from '../hooks/useSql';
import QueryList from '../components/sql/QueryList';
import { useSqlStore } from '../stores/useSqlStore';

export default function SqlEditor() {
    const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
    const { mutateAsync: runQuery, isPending, data: results, error } = useSql();
    const { saveQuery, addToHistory } = useSqlStore();

    // Save Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [newQueryName, setNewQueryName] = useState('');

    const handleRun = async () => {
        if (!query.trim()) return;
        const start = Date.now();
        try {
            await runQuery(query);
            addToHistory(query, 'success', Date.now() - start);
        } catch (err) {
            addToHistory(query, 'error', Date.now() - start);
        }
    };

    const handleSave = () => {
        if (!newQueryName.trim()) return;
        saveQuery(newQueryName, query);
        setNewQueryName('');
        setIsSaveModalOpen(false);
    };

    // Quick and dirty result table renderer
    const renderResults = () => {
        if (!results) return <div className="text-subtle p-8 text-center italic">Execute a query to see results here.</div>;
        if (!Array.isArray(results)) return <div className="text-accent p-4"><pre>{JSON.stringify(results, null, 2)}</pre></div>;
        if (results.length === 0) return <div className="text-subtle p-8 text-center">Query returned 0 rows.</div>;

        const keys = Object.keys(results[0]);

        return (
            <div className="overflow-auto h-full w-full">
                <table className="min-w-full border-collapse text-left text-xs font-mono">
                    <thead className="sticky top-0 bg-[#0C0C0C] z-10 border-b border-[#222]">
                        <tr>
                            {keys.map((key) => (
                                <th key={key} className="px-4 py-2 font-medium text-subtle uppercase tracking-wider whitespace-nowrap bg-[#0C0C0C]">
                                    {key}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((row, idx) => (
                            <tr key={idx} className="border-b border-[#1a1a1a] hover:bg-[#151515]">
                                {keys.map((key) => (
                                    <td key={key} className="px-4 py-1.5 text-zinc-300 whitespace-nowrap border-r border-[#1a1a1a] last:border-r-0 max-w-[300px] overflow-hidden text-ellipsis">
                                        {row[key] === null ? <span className="text-zinc-600">NULL</span> : String(row[key])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0A0A0A]">
            {/* Toolbar */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-[#0C0C0C] shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium text-accent">
                    <Terminal size={16} />
                    <span>SQL Query</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSaveModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] text-zinc-300 hover:text-white text-xs font-medium rounded transition-colors"
                    >
                        <Save size={14} />
                        <span>Save Snippet</span>
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isPending}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                    >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                        <span>RUN</span>
                    </button>
                </div>
            </div>

            {/* Layout: Main (Editor + Results) + Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Editor */}
                    <div className="h-[40%] border-b border-border relative">
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            theme="vs-dark"
                            value={query}
                            onChange={(val) => setQuery(val || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </div>

                    {/* Results */}
                    <div className="flex-1 bg-[#0A0A0A] flex flex-col min-h-0 overflow-hidden">
                        <div className="px-4 py-2 border-b border-border text-xs font-medium text-subtle uppercase tracking-wider bg-[#0E0E0E] shrink-0">
                            Results
                        </div>
                        <div className="flex-1 overflow-auto relative w-full h-full">
                            {error ? (
                                <div className="absolute inset-0 flex items-center justify-center p-8">
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded text-red-500 text-sm font-mono whitespace-pre-wrap max-w-full overflow-auto">
                                        <div className="flex items-center gap-2 mb-2 font-bold uppercase">
                                            <AlertTriangle size={16} />
                                            Error Executing Query
                                        </div>
                                        {error instanceof Error ? error.message : 'Unknown Error'}
                                    </div>
                                </div>
                            ) : (
                                renderResults()
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Librarian */}
                <QueryList onLoadQuery={setQuery} />
            </div>

            {/* Save Modal */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in">
                    <div className="bg-[#111] border border-[#333] p-6 rounded-lg w-[400px] shadow-2xl">
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Save Snippet</h3>
                        <input
                            autoFocus
                            type="text"
                            className="w-full bg-[#000] border border-[#333] rounded p-2 text-sm text-white outline-none focus:border-blue-500 mb-4"
                            placeholder="Enter snippet name..."
                            value={newQueryName}
                            onChange={(e) => setNewQueryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsSaveModalOpen(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!newQueryName}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                            >
                                Save Snippet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
