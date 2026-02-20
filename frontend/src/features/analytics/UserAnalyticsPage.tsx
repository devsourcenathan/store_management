import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { userAnalyticsApi } from '@/services/api';
import { useAuth } from '@/features/auth/useAuth';
import { AlertCircle, Download, Trophy, Medal, Award } from 'lucide-react';
import { Line, Pie, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export function UserAnalyticsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [period, setPeriod] = useState('month');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Fetch dashboard data
    const { data: dashboard, isLoading: isDashboardLoading } = useQuery({
        queryKey: ['user-analytics-dashboard', period, selectedUserId, customStart, customEnd],
        queryFn: async () => {
            const params: any = { period };
            if (selectedUserId) params.userId = selectedUserId;
            if (period === 'custom' && customStart && customEnd) {
                params.startDate = customStart;
                params.endDate = customEnd;
            }
            return await userAnalyticsApi.getDashboard(params);
        },
        enabled: user?.role === 'OWNER' || user?.role === 'MANAGER',
    });

    // Fetch rankings
    const { data: rankings } = useQuery({
        queryKey: ['user-analytics-rankings', period, customStart, customEnd],
        queryFn: async () => {
            const params: any = { period };
            if (period === 'custom' && customStart && customEnd) {
                params.startDate = customStart;
                params.endDate = customEnd;
            }
            return await userAnalyticsApi.getRankings(params);
        },
        enabled: user?.role === 'OWNER' || user?.role === 'MANAGER',
    });

    const handleExport = async () => {
        const params: any = { period };
        if (selectedUserId) params.userId = selectedUserId;
        if (period === 'custom' && customStart && customEnd) {
            params.startDate = customStart;
            params.endDate = customEnd;
        }

        const blob = await userAnalyticsApi.exportAnalytics(params);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-analytics-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    if (user?.role !== 'OWNER' && user?.role !== 'MANAGER') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {t('user_analytics.access_denied_title')}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('user_analytics.access_denied_desc')}
                    </p>
                </div>
            </div>
        );
    }

    // Calculate aggregated revenue from API response using useMemo
    const {
        totalSalesRevenue,
        totalMaintenanceRevenue,
        totalSubscriptionRevenue,
        totalRevenue,
        totalSales,
        totalMaintenances,
        completedMaintenances,
        totalSubscriptions,
        activeSubscriptions
    } = useMemo(() => {
        const salesRevenue = dashboard?.sales?.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0) || 0;
        const maintenanceRevenue = dashboard?.maintenances?.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0) || 0;
        const subscriptionRevenue = dashboard?.subscriptions?.reduce((sum: number, sub: any) => sum + (sub.revenue || 0), 0) || 0;

        return {
            totalSalesRevenue: salesRevenue,
            totalMaintenanceRevenue: maintenanceRevenue,
            totalSubscriptionRevenue: subscriptionRevenue,
            totalRevenue: salesRevenue + maintenanceRevenue + subscriptionRevenue,
            totalSales: dashboard?.sales?.reduce((sum: number, s: any) => sum + (s.salesCount || 0), 0) || 0,
            totalMaintenances: dashboard?.maintenances?.reduce((sum: number, m: any) => sum + (m.created || 0), 0) || 0,
            completedMaintenances: dashboard?.maintenances?.reduce((sum: number, m: any) => sum + (m.completed || 0), 0) || 0,
            totalSubscriptions: dashboard?.subscriptions?.reduce((sum: number, sub: any) => sum + (sub.subscriptionsCreated || 0), 0) || 0,
            activeSubscriptions: dashboard?.subscriptions?.reduce((sum: number, sub: any) => sum + (sub.renewalsProcessed || 0), 0) || 0
        };
    }, [dashboard]);

    // Prepare chart data
    const salesTrendData = {
        labels: dashboard?.salesTrend?.map((d: any) => d.date) || [],
        datasets: [
            {
                label: 'Sales',
                data: dashboard?.salesTrend?.map((d: any) => d.count) || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const revenueDistributionData = {
        labels: ['Sales', 'Maintenances', 'Subscriptions'],
        datasets: [
            {
                data: [
                    totalSalesRevenue,
                    totalMaintenanceRevenue,
                    totalSubscriptionRevenue,
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const topPerformersData = {
        labels: rankings?.slice(0, 5).map((r: any) => r.user.name) || [],
        datasets: [
            {
                label: 'Total Revenue',
                data: rankings?.slice(0, 5).map((r: any) => r.totalRevenue) || [],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('user_analytics.title')}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {t('user_analytics.subtitle')}
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Period Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('user_analytics.period')}
                            </label>
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="today">{t('user_analytics.periods.today')}</option>
                                <option value="week">{t('user_analytics.periods.week')}</option>
                                <option value="month">{t('user_analytics.periods.month')}</option>
                                <option value="quarter">{t('user_analytics.periods.quarter')}</option>
                                <option value="year">{t('user_analytics.periods.year')}</option>
                                <option value="custom">{t('user_analytics.periods.custom')}</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {period === 'custom' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('user_analytics.start_date')}
                                    </label>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('user_analytics.end_date')}
                                    </label>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </>
                        )}

                        {/* Export Button */}
                        <div className="flex items-end">
                            <button
                                onClick={handleExport}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                {t('user_analytics.export_csv')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Overview Cards */}
                {dashboard && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('user_analytics.total_revenue')}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {totalRevenue.toLocaleString()} F
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('user_analytics.sales')}</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {totalSales}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('user_analytics.maintenances')}</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {totalMaintenances}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('user_analytics.subscriptions')}</p>
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {totalSubscriptions}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Charts */}
            {dashboard && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales Trend */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {t('user_analytics.charts.sales_trend')}
                        </h3>
                        <div className="h-64">
                            <Line data={salesTrendData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Revenue Distribution */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {t('user_analytics.charts.revenue_distribution')}
                        </h3>
                        <div className="h-64">
                            <Pie data={revenueDistributionData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Top Performers */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {t('user_analytics.charts.top_performers')}
                        </h3>
                        <div className="h-64">
                            <Bar data={topPerformersData} options={chartOptions} />
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Stats */}
            {dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sales Performance */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {t('user_analytics.performance.sales_perf')}
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.total_sales')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {totalSales}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.revenue')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {totalSalesRevenue.toLocaleString()} F
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.avg_value')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {totalSales > 0
                                        ? (totalSalesRevenue / totalSales).toFixed(0)
                                        : 0}{' '}
                                    F
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance Performance */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {t('user_analytics.performance.maintenance_perf')}
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.total')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {totalMaintenances}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.revenue')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {totalMaintenanceRevenue.toLocaleString()} F
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.completed')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {completedMaintenances}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Performance */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {t('user_analytics.performance.subscription_perf')}
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.total')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {totalSubscriptions}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.revenue')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {totalSubscriptionRevenue.toLocaleString()} F
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('user_analytics.performance.active')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {activeSubscriptions}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rankings Table */}
            {rankings && rankings.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            {t('user_analytics.rankings.title')}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('user_analytics.rankings.rank')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('user_analytics.rankings.user')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('user_analytics.rankings.sales')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('user_analytics.rankings.maintenances')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('user_analytics.rankings.subscriptions')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('user_analytics.rankings.total_revenue')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {rankings.map((ranking: any, index: number) => (
                                    <tr key={ranking.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            <div className="flex items-center gap-2">
                                                {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                                                {index === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                                                {index === 2 && <Award className="w-5 h-5 text-orange-600" />}
                                                <span>{index + 1}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            <div>
                                                <div>{ranking.user.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {ranking.user.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {ranking.salesCount || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {ranking.maintenancesCount || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {ranking.subscriptionsCount || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {(ranking.totalRevenue || 0).toLocaleString()} F
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
