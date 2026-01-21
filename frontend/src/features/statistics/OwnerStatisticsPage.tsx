import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from 'react-i18next';
import { ExportButton } from '@/components/ExportButton';
import { BarChart3, TrendingUp, Store, DollarSign, Package, Users } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export function OwnerStatisticsPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [dateFilter, setDateFilter] = useState('this_month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const getDateRange = (filter: string) => {
        const now = new Date();
        let start = new Date(now.getFullYear(), now.getMonth(), 1);
        let end = new Date();

        switch (filter) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'this_week':
                const day = now.getDay() || 7;
                if (day !== 1) now.setHours(-24 * (day - 1));
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'this_quarter':
                const quarter = Math.floor((now.getMonth() + 3) / 3);
                start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case 'custom':
                if (customStart && customEnd) {
                    start = new Date(customStart);
                    end = new Date(customEnd);
                }
                break;
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString()
        };
    };

    const { startDate, endDate } = getDateRange(dateFilter);

    // Fetch aggregated stats
    const { data: aggregatedStats, isLoading: isLoadingAggregated } = useQuery({
        queryKey: ['analytics', 'owner', 'aggregated', user?.organizationId, dateFilter, customStart, customEnd],
        queryFn: async () => {
            const res = await api.get(`/analytics/owner/aggregated?organizationId=${user?.organizationId}&startDate=${startDate}&endDate=${endDate}`);
            return res.data;
        },
        enabled: !!user?.organizationId && user?.role === 'OWNER',
    });

    // Fetch stats by store
    const { data: statsByStore, isLoading: isLoadingByStore } = useQuery({
        queryKey: ['analytics', 'owner', 'by-store', user?.organizationId, dateFilter, customStart, customEnd],
        queryFn: async () => {
            const res = await api.get(`/analytics/owner/by-store?organizationId=${user?.organizationId}&startDate=${startDate}&endDate=${endDate}`);
            return res.data;
        },
        enabled: !!user?.organizationId && user?.role === 'OWNER',
    });

    // Fetch comparison data
    const { data: comparisonData, isLoading: isLoadingComparison } = useQuery({
        queryKey: ['analytics', 'owner', 'comparison', user?.organizationId, dateFilter, customStart, customEnd],
        queryFn: async () => {
            const res = await api.get(`/analytics/owner/comparison?organizationId=${user?.organizationId}&startDate=${startDate}&endDate=${endDate}`);
            return res.data;
        },
        enabled: !!user?.organizationId && user?.role === 'OWNER',
    });

    // Chart data for revenue comparison
    const revenueChartData = {
        labels: comparisonData?.stores || [],
        datasets: [
            {
                label: t('statistics.revenue_by_store'),
                data: comparisonData?.revenues || [],
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1,
            },
        ],
    };

    // Chart data for sales comparison
    const salesChartData = {
        labels: comparisonData?.stores || [],
        datasets: [
            {
                label: t('statistics.sales_by_store'),
                data: comparisonData?.sales || [],
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    // Export columns for stores data
    const exportColumns = [
        { header: t('settings.stores.store_name'), key: 'storeName' },
        { header: t('common.address'), key: 'storeAddress' },
        { header: t('statistics.total_revenue'), key: 'revenue' },
        { header: t('statistics.total_sales'), key: 'salesCount' },
        { header: t('statistics.total_products'), key: 'productCount' },
    ];

    if (user?.role !== 'OWNER') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Access Denied
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        This page is only accessible to organization owners.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('statistics.title')}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {t('statistics.subtitle')}
                    </p>
                </div>

                {/* Export Buttons */}
                <div className="flex flex-wrap gap-2">
                    <ExportButton
                        data={statsByStore || []}
                        columns={exportColumns}
                        title={t('statistics.by_store')}
                        format="pdf"
                    />
                    <ExportButton
                        data={statsByStore || []}
                        columns={exportColumns}
                        title={t('statistics.by_store')}
                        format="excel"
                    />
                </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-col gap-3 sm:gap-4 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t('dashboard.period')}
                    </span>
                </div>
                <div className="flex overflow-x-auto pb-1 scrollbar-hide smooth-scroll gap-2 w-full -mx-1 px-1">
                    {['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'custom'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setDateFilter(filter)}
                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${dateFilter === filter
                                ? 'bg-gray-900 text-white shadow-md dark:bg-gray-100 dark:text-gray-900'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t(`dashboard.filters.${filter}`)}
                        </button>
                    ))}
                </div>

                {dateFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="border-none text-xs sm:text-sm focus:ring-0 p-0 bg-transparent text-gray-700 dark:text-gray-300 w-28 sm:w-32"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="border-none text-xs sm:text-sm focus:ring-0 p-0 bg-transparent text-gray-700 dark:text-gray-300 w-28 sm:w-32"
                        />
                    </div>
                )}
            </div>

            {/* Aggregated Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                <StatCard
                    title={t('statistics.total_sales_revenue')}
                    value={`${aggregatedStats?.totalSalesRevenue?.toLocaleString() || 0} F`}
                    icon={<DollarSign className="w-6 h-6" />}
                    color="blue"
                    isLoading={isLoadingAggregated}
                />
                <StatCard
                    title={t('statistics.total_profit')}
                    value={`${aggregatedStats?.totalProfit?.toLocaleString() || 0} F`}
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="green"
                    isLoading={isLoadingAggregated}
                />
                <StatCard
                    title={t('statistics.total_sales')}
                    value={aggregatedStats?.totalSales || 0}
                    icon={<TrendingUp className="w-6 h-6" />}
                    color="purple"
                    isLoading={isLoadingAggregated}
                />
                <StatCard
                    title={t('statistics.total_products')}
                    value={aggregatedStats?.totalProducts || 0}
                    icon={<Package className="w-6 h-6" />}
                    color="indigo"
                    isLoading={isLoadingAggregated}
                />
                <StatCard
                    title={t('statistics.total_customers')}
                    value={aggregatedStats?.totalCustomers || 0}
                    icon={<Users className="w-6 h-6" />}
                    color="orange"
                    isLoading={isLoadingAggregated}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Revenue Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                        {t('statistics.revenue_by_store')}
                    </h3>
                    <div className="h-64">
                        {isLoadingComparison ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                            </div>
                        ) : (
                            <Bar data={revenueChartData} options={chartOptions} />
                        )}
                    </div>
                </div>

                {/* Sales Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                        {t('statistics.sales_by_store')}
                    </h3>
                    <div className="h-64">
                        {isLoadingComparison ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                            </div>
                        ) : (
                            <Bar data={salesChartData} options={chartOptions} />
                        )}
                    </div>
                </div>
            </div>

            {/* Stores Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {t('statistics.by_store')}
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('settings.stores.store_name')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('common.address')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('statistics.total_revenue')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('statistics.total_sales')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('statistics.total_products')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoadingByStore ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : statsByStore && statsByStore.length > 0 ? (
                                statsByStore.map((store: any) => (
                                    <tr key={store.storeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {store.storeName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {store.storeAddress || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100 font-medium">
                                            {store.revenue.toLocaleString()} F
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                                            {store.salesCount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                                            {store.productCount}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        {t('statistics.no_data')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, isLoading }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    {isLoading ? (
                        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                    ) : (
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
