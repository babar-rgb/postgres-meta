import { useSql } from '../../hooks/useSql';
import { Database, HardDrive, Activity, Users } from 'lucide-react';
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
        dbSize: '...',
        activeConnections: '...',
        tableCount: '...',
        totalRows: '...'
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. DB Size
                const sizeRes = await runQuery("SELECT pg_database_size(current_database());");
                const size = sizeRes?.[0]?.pg_database_size;

                // 2. Active Connections
                const conRes = await runQuery("SELECT count(*) FROM pg_stat_activity;");
                const cons = conRes?.[0]?.count;

                // 3. Table Count (Public)
                const tablesRes = await runQuery("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';");
                const tables = tablesRes?.[0]?.count;

                // 4. Total Rows (Approx)
                const rowsRes = await runQuery(`
                    SELECT sum(n_live_tup) as total_rows 
                    FROM pg_stat_user_tables;
                `);
                const rows = rowsRes?.[0]?.total_rows || 0;

                setStats({
                    dbSize: formatBytes(Number(size)),
                    activeConnections: String(cons),
                    tableCount: String(tables),
                    totalRows: String(rows)
                });
            } catch (e) {
                console.error("Failed to fetch dashboard stats", e);
            }
        };

        fetchStats();
    }, []); // Run once on mount

    const cards = [
        { label: 'Database Size', value: stats.dbSize, icon: HardDrive, color: 'text-blue-500' },
        { label: 'Active Connections', value: stats.activeConnections, icon: Activity, color: 'text-green-500' },
        { label: 'Tables', value: stats.tableCount, icon: Database, color: 'text-purple-500' },
        { label: 'Total Rows (Est)', value: stats.totalRows, icon: Users, color: 'text-orange-500' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <div key={card.label} className="bg-[#0C0C0C] border border-[#222] p-4 rounded-lg flex flex-col justify-between hover:border-[#333] transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-subtle uppercase tracking-wider">{card.label}</span>
                        <card.icon size={16} className={`${card.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <div className="text-2xl font-mono text-white font-medium">
                        {card.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
