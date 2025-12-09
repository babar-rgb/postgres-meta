import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    requests: Math.floor(Math.random() * 100) + 20,
    latency: Math.floor(Math.random() * 50) + 10,
}));

export default function ActivityChart() {
    return (
        <div className="bg-[#0C0C0C] border border-[#222] rounded-lg p-4 h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold text-subtle uppercase tracking-wider mb-4">API Activity (24h)</h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#444"
                            tick={{ fill: '#666', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval={3}
                        />
                        <YAxis
                            stroke="#444"
                            tick={{ fill: '#666', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#10B981' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="requests"
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorReq)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
