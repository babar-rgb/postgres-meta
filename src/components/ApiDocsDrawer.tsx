import { useState, useMemo } from 'react';
import { X, Copy, Check, FileCode, Terminal, Database } from 'lucide-react';
import { generateSnippets, ColDef } from '../utils/codeGenerators';

interface ApiDocsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    columns?: any[]; // We'll map the DataGrid columns to ColDef
}

type TabType = 'js' | 'curl' | 'sql';

export default function ApiDocsDrawer({ isOpen, onClose, tableName, columns = [] }: ApiDocsDrawerProps) {
    const [activeTab, setActiveTab] = useState<TabType>('js');
    const [copied, setCopied] = useState(false);

    const snippets = useMemo(() => {
        // Transform react-table columns or raw data to simple ColDef
        // Assuming columns passed here might be the full accessor objects from DataGrid
        // We'll try to extract simple name/type if possible, or fallback to name/text
        const simpleCols: ColDef[] = columns.map(c => ({
            name: c.id || c.accessorKey || 'unknown',
            type: 'text' // We might not have full type info in DataGrid columns yet, defaulting to text is safe for mock gen
        }));
        return generateSnippets(tableName, simpleCols);
    }, [tableName, columns]);

    const activeSnippets = snippets[activeTab] as any;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

            <div className="absolute right-0 top-0 h-full w-[600px] bg-[#0A0A0A] border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-[#0C0C0C]">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-900/20 text-green-500 rounded">
                            <FileCode size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white">API Documentation</h2>
                            <p className="text-[10px] text-subtle font-mono">public.{tableName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-subtle hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-2 border-b border-border bg-[#0E0E0E]">
                    <button
                        onClick={() => setActiveTab('js')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'js' ? 'bg-[#222] text-white' : 'text-subtle hover:text-zinc-300'}`}
                    >
                        <div className="text-yellow-400 font-bold">JS</div>
                        <span>JavaScript</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('curl')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'curl' ? 'bg-[#222] text-white' : 'text-subtle hover:text-zinc-300'}`}
                    >
                        <Terminal size={14} className="text-blue-400" />
                        <span>Bash / cURL</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sql')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === 'sql' ? 'bg-[#222] text-white' : 'text-subtle hover:text-zinc-300'}`}
                    >
                        <Database size={14} className="text-purple-400" />
                        <span>SQL</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-8">

                    {/* READ */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500">Read Rows</h3>
                            <button
                                onClick={() => handleCopy(activeSnippets.read)}
                                className="text-subtle hover:text-white transition-colors"
                                title="Copy"
                            >
                                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <pre className="bg-[#111] border border-border rounded p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                            <code>{activeSnippets.read}</code>
                        </pre>
                    </section>

                    {/* INSERT */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-500">Insert Row</h3>
                        </div>
                        <pre className="bg-[#111] border border-border rounded p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                            <code>{activeSnippets.insert}</code>
                        </pre>
                    </section>

                    {/* EXTRAS */}
                    {activeTab === 'curl' && (
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-500">Filtering</h3>
                            </div>
                            <pre className="bg-[#111] border border-border rounded p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                                <code>{activeSnippets.filter}</code>
                            </pre>
                        </section>
                    )}

                    {activeTab === 'js' && (
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-500">Update Row</h3>
                            </div>
                            <pre className="bg-[#111] border border-border rounded p-4 text-xs font-mono text-zinc-300 overflow-x-auto">
                                <code>{activeSnippets.update}</code>
                            </pre>
                        </section>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-[#0C0C0C] text-[10px] text-zinc-600">
                    Snippets generated based on your local configuration. Use the `supabase-js` client library for best experience.
                </div>

            </div>
        </div>
    );
}
