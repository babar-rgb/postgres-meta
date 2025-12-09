import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ConnectionConfig {
    metaUrl: string;
    dataUrl: string;
    authToken?: string;
}

interface ConnectionContextType extends ConnectionConfig {
    updateConfig: (config: ConnectionConfig) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<ConnectionConfig>(() => {
        const savedMeta = localStorage.getItem('nexus_meta_url');
        const savedData = localStorage.getItem('nexus_data_url');
        const savedAuth = localStorage.getItem('nexus_auth_token');

        // Default to existing proxy paths if nothing saved, 
        // OR default to localhost direct ports if we want to bypass proxy logic by default.
        // The prompt implies we want to be able to type "http://localhost:8080".
        // Let's default to the proxy paths initially for backward compatibility, 
        // OR default to the direct ports as per prompt description.
        // Prompt says: Default: http://localhost:8080
        return {
            metaUrl: savedMeta || 'http://localhost:8080',
            dataUrl: savedData || 'http://localhost:3000',
            authToken: savedAuth || '',
        };
    });

    useEffect(() => {
        localStorage.setItem('nexus_meta_url', config.metaUrl);
        localStorage.setItem('nexus_data_url', config.dataUrl);
        if (config.authToken) {
            localStorage.setItem('nexus_auth_token', config.authToken);
        } else {
            localStorage.removeItem('nexus_auth_token');
        }
    }, [config]);

    const updateConfig = (newConfig: ConnectionConfig) => {
        setConfig(newConfig);
        // Ideally we might trigger a global re-fetch here
        // For now, React Query's eventual consistency or manual invalidation works
        window.location.reload(); // Hard reload to force all services to pick up new URLs immediately (e.g. api.ts refs)
    };

    return (
        <ConnectionContext.Provider value={{ ...config, updateConfig }}>
            {children}
        </ConnectionContext.Provider>
    );
}

export const useConnection = () => {
    const context = useContext(ConnectionContext);
    if (context === undefined) {
        throw new Error('useConnection must be used within a ConnectionProvider');
    }
    return context;
};
