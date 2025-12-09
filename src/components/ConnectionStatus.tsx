import { useState, useEffect } from 'react';

export default function ConnectionStatus() {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const checkConnection = async () => {
            try {
                // Simple health check or fetch tables to verify connectivity to postgres-meta
                // Using /api/meta/tables as a proxy to check if meta service is up
                const res = await fetch('/api/meta/tables?limit=1');
                if (res.ok) {
                    setStatus('connected');
                    setErrorMsg(null);
                } else {
                    setStatus('error');
                    setErrorMsg(`HTTP ${res.status}`);
                }
            } catch (err) {
                setStatus('error');
                setErrorMsg('Network Error');
                console.error('Connection Check Failed:', err);
            }
        };

        checkConnection();
        // Optional: Poll every 30s
        const interval = setInterval(checkConnection, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2" title={errorMsg || 'Connected to Backend'}>
            <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' :
                    status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
            <span className="text-[10px] uppercase tracking-wider opacity-70">
                {status === 'connected' ? 'Online' : status === 'error' ? 'Offline' : 'Checking'}
            </span>
        </div>
    );
}
