import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ConnectionConfig {
    metaUrl: string;
    dataUrl: string;
    authToken?: string;
    // DB Config for Desktop
    dbConfig?: {
        host: string;
        port: number;
        database: string;
        user: string;
        password?: string;
    };
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

        // Desktop Config (Saved)
        const savedDbHost = localStorage.getItem('nexus_db_host');
        const savedDbPort = localStorage.getItem('nexus_db_port');
        const savedDbName = localStorage.getItem('nexus_db_name');
        const savedDbUser = localStorage.getItem('nexus_db_user');

        return {
            metaUrl: savedMeta || 'http://localhost:8080',
            dataUrl: savedData || 'http://localhost:3000',
            authToken: savedAuth || '',
            dbConfig: {
                host: savedDbHost || 'localhost',
                port: parseInt(savedDbPort || '5432'),
                database: savedDbName || 'otwarty_parlament', // User Request
                user: savedDbUser || 'kajtek',                 // User Request
                password: 'postgres' // Default fallback
            }
        };
    });

    useEffect(() => {
        // Save to LocalStorage
        localStorage.setItem('nexus_meta_url', config.metaUrl);
        localStorage.setItem('nexus_data_url', config.dataUrl);
        if (config.authToken) {
            localStorage.setItem('nexus_auth_token', config.authToken);
        } else {
            localStorage.removeItem('nexus_auth_token');
        }

        if (config.dbConfig) {
            localStorage.setItem('nexus_db_host', config.dbConfig.host);
            localStorage.setItem('nexus_db_port', config.dbConfig.port.toString());
            localStorage.setItem('nexus_db_name', config.dbConfig.database);
            localStorage.setItem('nexus_db_user', config.dbConfig.user);
        }

        // Auto-Connect for Desktop (Electron)
        if ((window as any).electron && config.dbConfig) {
            console.log("Initializing Desktop DB Connection...", config.dbConfig);
            (window as any).electron.connect(config.dbConfig)
                .then((res: any) => {
                    if (res.success) console.log("DB Connected Successfully");
                    else console.error("DB Connection Failed", res.error);
                });
        }
    }, [config]);

    const updateConfig = (newConfig: ConnectionConfig) => {
        setConfig(newConfig);
        // Force reload only if switching fundamental modes, otherwise context propagation handles it
        // For now, keeping reload ensures clean state
        window.location.reload();
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
