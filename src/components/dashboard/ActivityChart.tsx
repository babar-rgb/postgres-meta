import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';

interface DataPoint {
    time: string;
    tps: number;
    fullTime?: string;
}

export default function ActivityChart() {
    // History Data (Slow, 24h)
    const [data, setData] = useState<DataPoint[]>([]);

    // Live Value (Fast)
    const [currentTps, setCurrentTps] = useState<number>(0);

    const lastTxCountRef = useRef<number>(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Config: 1 Minute Interval = 1440 points for 24h
    const MAX_POINTS = 1440;
    const CHART_INTERVAL = 60000; // 60s
    const LIVE_INTERVAL = 3000;   // 3s

    // Changing implementation slightly to use ref for TPS transport to avoid dep issues
    const tpsRef = useRef(0);
    useEffect(() => { tpsRef.current = currentTps; }, [currentTps]);

    useEffect(() => {
        // 1. Initial Pre-fill for 24h scale 
        // We fill past 24h with 0 to force the axis to look like a full day scale
        const now = new Date();
        const initialData: DataPoint[] = [];
        for (let i = MAX_POINTS; i > 0; i--) {
            const d = new Date(now.getTime() - (i * CHART_INTERVAL));
            initialData.push({
                time: d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
                tps: 0,
                fullTime: d.toLocaleTimeString()
            });
        }
        setData(initialData);

        const fetchStats = async () => {
            try {
                const res = await api.executeQuery("SELECT sum(xact_commit + xact_rollback) as val FROM pg_stat_database;");
                const currentTotal = parseInt(res[0]?.val || '0', 10);

                if (lastTxCountRef.current !== 0) {
                    const delta = currentTotal - lastTxCountRef.current;
                    // Calculate TPS based on the LIVE interval since we check often
                    let tps = delta < 0 ? 0 : (delta / (LIVE_INTERVAL / 1000));
                    tps = Math.round(tps * 10) / 10;

                    setCurrentTps(tps);
                }
                lastTxCountRef.current = currentTotal;
                return currentTotal;
            } catch (err) {
                console.error("Failed to fetch Stats", err);
                return 0;
            }
        };

        // Live Poll (Updates the big number)
        liveIntervalRef.current = setInterval(fetchStats, LIVE_INTERVAL);

        // Chart Update Loop (Updates the graph history)
        intervalRef.current = setInterval(() => {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });

            // We use the current instantaneous TPS as the data point for this minute
            // (Simplification for UX)
            setData(prev => {
                const next = [...prev, { time: timeLabel, tps: tpsRef.current, fullTime: now.toLocaleTimeString() }];
                if (next.length > MAX_POINTS) return next.slice(next.length - MAX_POINTS);
                return next;
            });
        }, CHART_INTERVAL);

        fetchStats(); // Initial fetch

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
        };
    }, []); // Empty dependency array to run once on mount

    return (
        <div className="bg-[#0C0C0C] border border-[#222] rounded-lg p-4 h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-subtle uppercase tracking-wider flex items-baseline gap-2">
                        24h History
                        <span className="text-[10px] text-zinc-600 normal-case font-normal">(1 min interval)</span>
                    </h3>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-mono text-white font-medium">{currentTps}</span>
                        <span className="text-xs text-subtle">TPS (Live)</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-xs text-blue-500 font-mono">RECORDING</span>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#444"
                            tick={{ fill: '#666', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={50}
                        />
                        <YAxis
                            stroke="#444"
                            tick={{ fill: '#666', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#60A5FA' }}
                            labelStyle={{ color: '#888' }}
                            labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0 && payload[0].payload.fullTime) {
                                    return payload[0].payload.fullTime;
                                }
                                return label;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="tps"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorReq)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
