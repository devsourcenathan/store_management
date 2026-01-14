import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

interface SalesChartProps {
    data: { date: string; amount: number }[];
    isLoading: boolean;
}

export function SalesChart({ data, isLoading }: SalesChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isLoading) {
        return <div className="h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse dark:text-gray-400">Loading Chart...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg text-gray-400 dark:text-gray-500">No data available</div>;
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#374151" : "#f3f4f6"} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            backgroundColor: isDark ? '#1f2937' : '#ffffff',
                            color: isDark ? '#f3f4f6' : '#111827'
                        }}
                        formatter={(value: number | undefined) => [`${(value || 0).toLocaleString()} FCFA`, 'Revenue']}
                    />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
