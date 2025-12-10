import { useSql } from '../../hooks/useSql';
import { Database, HardDrive, Activity, Users, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

// Utils to format bytes
function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function StatCards() {
    const { mutateAsync: runQuery } = useSql();
    const [stats, setStats] = useState({
        dbSize: { value: '...', error: false },
        activeConnections: { value: '...', error: false },
        tableCount: { value: '...', error: false },
        totalRows: { value: '...', error: false },
        generalError: null as string | null
    });

    useEffect(() => {
        const fetchStats = async () => {
            // Reset error
            setStats(prev => ({ ...prev, generalError: null }));

            const results = await Promise.allSettled([
                // 1. DB Size
                runQuery("SELECT pg_database_size(current_database());"),
                // 2. Active Connections
                runQuery("SELECT count(*) as count FROM pg_stat_activity;"),
                // 3. Table Count
                runQuery("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public';"),
                // 4. Total Rows
                runQuery("SELECT sum(n_live_tup) as total_rows FROM pg_stat_user_tables;")
            ]);

            const newStats = { ...stats, generalError: null };

            // Process DB Size
            if (results[0].status === 'fulfilled') {
                const size = results[0].value?.[0]?.pg_database_size;
                newStats.dbSize = { value: formatBytes(Number(size || 0)), error: false };
            } else {
                console.error("DB Size Error:", results[0].reason);
                newStats.dbSize = { value: 'Err', error: true };
            }

            // Process Active Connections
            if (results[1].status === 'fulfilled') {
                const count = results[1].value?.[0]?.count;
                newStats.activeConnections = { value: String(count || 0), error: false };
            } else {
                newStats.activeConnections = { value: 'Err', error: true };
            }

            // Process Table Count
            if (results[2].status === 'fulfilled') {
                const count = results[2].value?.[0]?.count;
                newStats.tableCount = { value: String(count || 0), error: false };
            } else {
                newStats.tableCount = { value: 'Err', error: true };
            }

            // Process Total Rows
            if (results[3].status === 'fulfilled') {
                const rows = results[3].value?.[0]?.total_rows;
                newStats.totalRows = { value: String(rows || 0), error: false };
            } else {
                // This query often fails on permissions, so we can fail gracefully
                newStats.totalRows = { value: 'N/A', error: true };
            }

            setStats(newStats);
        };

        fetchStats();
    }, []);

    const cards = [
        { label: 'Database Size', ...stats.dbSize, icon: HardDrive, color: 'text-blue-500' },
        { label: 'Active Connections', ...stats.activeConnections, icon: Activity, color: 'text-green-500' },
        { label: 'Tables', ...stats.tableCount, icon: Database, color: 'text-purple-500' },
        { label: 'Total Rows (Est)', ...stats.totalRows, icon: Users, color: 'text-orange-500' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <div key={card.label} className="bg-[#0C0C0C] border border-[#222] p-4 rounded-lg flex flex-col justify-between hover:border-[#333] transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-subtle uppercase tracking-wider">{card.label}</span>
                        <card.icon size={16} className={`${card.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <div className="flex items-center gap-2 text-2xl font-mono text-white font-medium">
                        {card.value}
                        {card.error && (
                            <div title="Failed to fetch metric">
                                <AlertCircle size={16} className="text-red-500" />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
