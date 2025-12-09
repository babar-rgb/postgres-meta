import { useState, useEffect } from 'react';
import { X, Save, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useConnection } from '../../context/ConnectionContext';

interface ConnectionSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ConnectionSettings({ isOpen, onClose }: ConnectionSettingsProps) {
    const { metaUrl, dataUrl, authToken, updateConfig } = useConnection();

    const [localMetaUrl, setLocalMetaUrl] = useState(metaUrl);
    const [localDataUrl, setLocalDataUrl] = useState(dataUrl);
    const [localAuthToken, setLocalAuthToken] = useState(authToken || '');

    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
    const [testMessage, setTestMessage] = useState('');

    // Reset local state when opening
    useEffect(() => {
        if (isOpen) {
            setLocalMetaUrl(metaUrl);
            setLocalDataUrl(dataUrl);
            setLocalAuthToken(authToken || '');
            setTestStatus('idle');
            setTestMessage('');
        }
    }, [isOpen, metaUrl, dataUrl, authToken]);

    if (!isOpen) return null;

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            // Test Meta API
            // Try to fetch something simple, e.g. /tables or just base
            // PostgREST usually exposes root with OpenAPI info
            // Meta exposes /tables

            // Remove trailing slashes for consistency
            const cleanMeta = localMetaUrl.replace(/\/$/, "");

            const response = await fetch(`${cleanMeta}/tables?limit=1`, {
                headers: localAuthToken ? { 'Authorization': `Bearer ${localAuthToken}` } : {}
            });

            if (!response.ok) {
                throw new Error(`Meta API failed: ${response.status} ${response.statusText}`);
            }

            setTestStatus('success');
            setTestMessage('Connected to Postgres Meta successfully');
        } catch (e) {
            setTestStatus('failed');
            setTestMessage(e instanceof Error ? e.message : 'Connection failed');
        }
    };

    const handleSave = () => {
        updateConfig({
            metaUrl: localMetaUrl.replace(/\/$/, ""),
            dataUrl: localDataUrl.replace(/\/$/, ""),
            authToken: localAuthToken
        });
        // The context will trigger a reload, so we might not even need onClose
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0A0A0A] border border-border w-full max-w-md rounded-lg shadow-2xl flex flex-col">

                <div className="flex items-center justify-between p-4 border-b border-border bg-[#0C0C0C]">
                    <h2 className="text-lg font-semibold text-white">Connection Settings</h2>
                    <button onClick={onClose} className="text-subtle hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-subtle mb-2">Postgres Meta URL</label>
                        <input
                            type="text"
                            className="w-full bg-[#111] border border-border rounded p-2 text-white outline-none focus:border-blue-600 transition-colors placeholder-zinc-700 text-sm font-mono"
                            value={localMetaUrl}
                            onChange={e => setLocalMetaUrl(e.target.value)}
                            placeholder="http://localhost:8080"
                        />
                        <p className="text-[10px] text-zinc-600 mt-1">Responsible for schema management (tables, columns).</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-subtle mb-2">PostgREST URL</label>
                        <input
                            type="text"
                            className="w-full bg-[#111] border border-border rounded p-2 text-white outline-none focus:border-blue-600 transition-colors placeholder-zinc-700 text-sm font-mono"
                            value={localDataUrl}
                            onChange={e => setLocalDataUrl(e.target.value)}
                            placeholder="http://localhost:3000"
                        />
                        <p className="text-[10px] text-zinc-600 mt-1">Responsible for row data (CRUD operations).</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-subtle mb-2">Auth Token (Optional)</label>
                        <input
                            type="password"
                            className="w-full bg-[#111] border border-border rounded p-2 text-white outline-none focus:border-blue-600 transition-colors placeholder-zinc-700 text-sm font-mono"
                            value={localAuthToken}
                            onChange={e => setLocalAuthToken(e.target.value)}
                            placeholder="Bearer ..."
                        />
                    </div>

                    <div className="bg-yellow-900/10 border border-yellow-900/30 p-3 rounded text-[11px] text-yellow-600/80">
                        <strong>Note:</strong> Ensure your backend services (Docker) allow CORS from this origin.
                    </div>

                    {/* Test Results */}
                    {testStatus !== 'idle' && (
                        <div className={`flex items-center gap-2 text-xs p-2 rounded ${testStatus === 'success' ? 'text-green-400 bg-green-900/10' :
                                testStatus === 'failed' ? 'text-red-400 bg-red-900/10' :
                                    'text-blue-400 bg-blue-900/10'
                            }`}>
                            {testStatus === 'testing' && <Loader2 size={14} className="animate-spin" />}
                            {testStatus === 'success' && <CheckCircle size={14} />}
                            {testStatus === 'failed' && <XCircle size={14} />}
                            <span>
                                {testStatus === 'testing' ? 'Testing connection...' :
                                    testStatus === 'success' ? 'Connection verified!' :
                                        testMessage}
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border bg-[#0C0C0C] flex items-center justify-between">
                    <button
                        onClick={handleTestConnection}
                        disabled={testStatus === 'testing'}
                        className="text-xs text-blue-500 hover:text-blue-400 underline decoration-dotted underline-offset-4"
                    >
                        Test Connection
                    </button>

                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-subtle hover:text-white transition-colors">Cancel</button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-sm font-medium rounded flex items-center gap-2 transition-colors"
                        >
                            <Save size={16} />
                            <span>Save & Reload</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
