import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '../stores/StoreProvider';
import { SalesChart } from './components/SalesChart';
import { TopProducts } from './components/TopProducts';
import { useTranslation } from 'react-i18next';
import { StoreFormSheet } from '../settings/components/StoreFormSheet';

export function DashboardPage() {
    const { currentStore } = useStore();
    const { t } = useTranslation();
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
        if (dateFilter === 'today') return t('dashboard.filters.today');
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

    const { stores, isLoading: isLoadingStores } = useStore();
    const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);


    if (!isLoadingStores && stores.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="bg-theme-primary/10 p-6 rounded-full">
                    <BoxIcon className="w-12 h-12 text-theme-primary" />
                </div>
                <div className="max-w-md space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.welcome_title')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('dashboard.welcome_subtitle')}
                    </p>
                </div>

                <button
                    onClick={() => setIsCreateStoreOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 btn-theme-primary rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
                >
                    <div className="w-5 h-5">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    {t('dashboard.create_first_store')}
                </button>

                <StoreFormSheet
                    isOpen={isCreateStoreOpen}
                    onClose={() => setIsCreateStoreOpen(false)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header: Title & Actions */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('dashboard.subtitle')}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <ActionButton
                        to="/pos"
                        label={t('dashboard.actions.pos')}
                        icon={<CalculatorIcon className="w-4 h-4" />}
                        variant="primary-large"
                    />
                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden lg:block"></div>
                    <ActionButton
                        to="/sales"
                        label={t('dashboard.actions.history')}
                        icon={<DollarIcon className="w-4 h-4" />}
                        variant="outline"
                    />
                    <ActionButton
                        to="/products"
                        label={t('dashboard.actions.products')}
                        icon={<BoxIcon className="w-4 h-4" />}
                        variant="outline"
                    />
                    <ActionButton
                        to="/stock"
                        label={t('dashboard.actions.stock')}
                        icon={<TruckIcon className="w-4 h-4" />}
                        variant="outline"
                    />
                </div>
            </div>

            {/* Filters Row - Separate Section */}
            <div className="flex flex-col gap-3 sm:gap-4 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{t('dashboard.period')}</span>
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
                            {/* @ts-ignore */}
                            {t(`dashboard.filters.${filter}`)}
                        </button>
                    ))}
                </div>

                {/* Custom Date Inputs */}
                {dateFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-left-2 duration-200 w-full sm:w-auto">
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <StatCard
                    title={`${t('dashboard.today_revenue')} (${periodLabel})`}
                    value={stats?.todaysSales ? `${stats.todaysSales.toLocaleString()} F` : '0 F'}
                    icon={<DollarIcon />}
                    color="blue"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    title={t('dashboard.total_products')}
                    value={stats?.totalProducts || 0}
                    icon={<BoxIcon />}
                    color="indigo"
                    isLoading={isLoadingStats}
                />
                <StatCard
                    title={t('dashboard.low_stock')}
                    value={stats?.lowStockItems || 0}
                    icon={<AlertIcon />}
                    color="yellow"
                    isLoading={isLoadingStats}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('dashboard.revenue_trend')}</h3>
                        <span className="text-sm font-medium text-theme-primary bg-theme-primary/10 px-3 py-1 rounded-full">{periodLabel}</span>
                    </div>
                    {/* Charts usually support dark mode via props or CSS variables, we might need to update SalesChart later */}
                    <SalesChart data={salesTrend} isLoading={isLoadingTrend} />
                </div>

                {/* Top Products */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('dashboard.top_selling')}</h3>
                    <TopProducts data={topProducts} isLoading={isLoadingTop} />
                </div>
            </div>
        </div>
    );
}

function ActionButton({ to, label, icon, variant = 'primary' }: any) {
    const baseStyles = "flex items-center gap-2 rounded-lg font-medium transition-all duration-200 shadow-sm whitespace-nowrap";
    const variants = {
        "primary-large": "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md px-5 py-2.5 text-base active:transform active:scale-95 ring-2 ring-indigo-100 dark:ring-indigo-900",
        primary: "btn-theme-primary hover:shadow-md px-4 py-2 text-sm active:transform active:scale-95",
        outline: "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 px-4 py-2 text-sm active:transform active:scale-95"
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
        blue: 'bg-theme-primary/10 text-theme-primary',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
        yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-400',
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
