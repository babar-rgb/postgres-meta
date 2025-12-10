import { api } from '../lib/api';
import { useState, useEffect } from 'react';

export default function ConnectionStatus() {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const checkConnection = async () => {
        try {
            // Use centralized API check which handles both Web (fetch) and Electron (IPC)
            await api.checkConnection();
            setStatus('connected');
            setErrorMsg(null);
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Error');
            console.error('Connection Check Failed:', err);
        }
    };

    useEffect(() => {
        checkConnection();

        // Poll frequency depends on status
        // If error (offline), poll frequent (5s) to detect recovery
        // If connected, poll infrequent (30s) to save resources
        const intervalMs = status === 'error' ? 5000 : 30000;
        const interval = setInterval(checkConnection, intervalMs);

        return () => clearInterval(interval);
    }, [status]); // Re-create interval when status changes

    return (
        <div
            className="flex items-center gap-2 cursor-pointer group"
            title={errorMsg || 'Connected to Backend (Click to refresh)'}
            onClick={checkConnection}
        >
            <div className={`w-2 h-2 rounded-full transition-colors ${status === 'connected' ? 'bg-green-500' :
                status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
            <span className="text-[10px] uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
                {status === 'connected' ? 'Online' : status === 'error' ? 'Offline' : 'Checking'}
            </span>
        </div>
    );
}
