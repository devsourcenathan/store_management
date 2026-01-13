import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import { SalesChart } from './components/SalesChart';
import { TopProducts } from './components/TopProducts';

export function DashboardPage() {
    const { currentStore } = useStore();
    const [dateFilter, setDateFilter] = useState('this_month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const getDateRange = (filter: string) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start = today;
        let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        switch (filter) {
            case 'today':
                start = today;
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
                    end.setHours(23, 59, 59, 999);
                } else {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                }
                break;
            default:
                start = new Date(now.setDate(now.getDate() - 7));
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            startObj: start,
            endObj: end
        };
    };

    const { startDate, endDate, startObj, endObj } = getDateRange(dateFilter);

    // Dynamic Title Generator
    const getPeriodLabel = () => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        if (dateFilter === 'today') return "Today";
        if (dateFilter === 'custom' && customStart && customEnd) {
            return `${new Date(customStart).toLocaleDateString('en-US', options)} - ${new Date(customEnd).toLocaleDateString('en-US', options)}`;
        }
        return `${startObj.toLocaleDateString('en-US', options)} - ${endObj.toLocaleDateString('en-US', options)}`;
    };

    const periodLabel = getPeriodLabel();

    // 1. Dashboard Key Metrics
    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['analytics', 'dashboard', currentStore?.id, dateFilter, customStart, customEnd],
        queryFn: async () => {
            if (!currentStore?.id) return null;
            const res = await api.get(`/analytics/dashboard?storeId=${currentStore.id}&startDate=${startDate}&endDate=${endDate}`);
            return res.data;
        },
        enabled: !!currentStore?.id,
    });

    // 2. Sales Trend Chart Data
    const { data: salesTrend, isLoading: isLoadingTrend } = useQuery({
        queryKey: ['analytics', 'trend', currentStore?.id, dateFilter, customStart, customEnd],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            const res = await api.get(`/analytics/sales-trend?storeId=${currentStore.id}&startDate=${startDate}&endDate=${endDate}`);
            return res.data;
        },
        enabled: !!currentStore?.id,
    });

    // 3. Top Products
    const { data: topProducts, isLoading: isLoadingTop } = useQuery({
        queryKey: ['analytics', 'top-products', currentStore?.id, dateFilter, customStart, customEnd],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            const res = await api.get(`/analytics/top-products?storeId=${currentStore.id}&startDate=${startDate}&endDate=${endDate}`);
            return res.data;
        },
        enabled: !!currentStore?.id,
    });

    return (
        <div className="space-y-6 pb-12">
            {/* Header: Title & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <p className="text-gray-600">Overview of your store performance</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    <ActionButton
                        to="/pos"
                        label="Open POS"
                        icon={<CalculatorIcon className="w-4 h-4" />}
                        variant="primary-large"
                    />
                    <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>
                    <ActionButton
                        to="/sales"
                        label="History"
                        icon={<DollarIcon className="w-4 h-4" />}
                        variant="outline"
                    />
                    <ActionButton
                        to="/products"
                        label="Products"
                        icon={<BoxIcon className="w-4 h-4" />}
                        variant="outline"
                    />
                    <ActionButton
                        to="/stock"
                        label="Stock"
                        icon={<TruckIcon className="w-4 h-4" />}
                        variant="outline"
                    />
                </div>
            </div>

            {/* Filters Row - Separate Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                <span className="text-sm font-medium text-gray-500 pl-2">Period:</span>
                <div className="flex overflow-x-auto pb-1 sm:pb-0 gap-1 w-full sm:w-auto">
                    {['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'custom'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setDateFilter(filter)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${dateFilter === filter
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                        >
                            {filter === 'custom' ? 'Custom Range' : filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>

                {/* Custom Date Inputs */}
                {dateFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-left-2 duration-200 sm:ml-auto">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="border-none text-sm focus:ring-0 p-0 bg-transparent text-gray-700 w-32"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="border-none text-sm focus:ring-0 p-0 bg-transparent text-gray-700 w-32"
                        />
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={`Revenue (${periodLabel})`}
                    value={stats?.todaysSales ? `${stats.todaysSales.toLocaleString()} F` : '0 F'}
                    icon={<DollarIcon />}
                    color="blue"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    title="Total Products"
                    value={stats?.totalProducts || 0}
                    icon={<BoxIcon />}
                    color="indigo"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={stats?.lowStockItems || 0}
                    icon={<AlertIcon />}
                    color="yellow"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    title="Pending Orders"
                    value={stats?.pendingOrders || 0}
                    icon={<TruckIcon />}
                    color="purple"
                    isLoading={isLoadingStats}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{periodLabel}</span>
                    </div>
                    <SalesChart data={salesTrend} isLoading={isLoadingTrend} />
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Products</h3>
                    <TopProducts data={topProducts} isLoading={isLoadingTop} />
                </div>
            </div>
        </div>
    );
}

function ActionButton({ to, label, icon, variant = 'primary' }: any) {
    const baseStyles = "flex items-center gap-2 rounded-lg font-medium transition-all duration-200 shadow-sm whitespace-nowrap";
    const variants = {
        "primary-large": "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md px-5 py-2.5 text-base active:transform active:scale-95 ring-2 ring-indigo-100",
        primary: "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md px-4 py-2 text-sm active:transform active:scale-95",
        outline: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 px-4 py-2 text-sm active:transform active:scale-95"
    };

    return (
        <Link to={to} className={`${baseStyles} ${variants[variant as keyof typeof variants]}`}>
            {icon}
            {label}
        </Link>
    );
}

function StatCard({ title, value, icon, color, isLoading }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    {isLoading ? (
                        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-1"></div>
                    ) : (
                        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

// Icons
const DollarIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const BoxIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const AlertIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);
const TruckIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);
const CalculatorIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
);
