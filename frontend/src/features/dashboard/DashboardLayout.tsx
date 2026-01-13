import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useSync } from '@/offline/SyncProvider';
import { StoreSelector } from '@/features/stores/StoreSelector';
import { NoAccessPage } from '@/features/auth/NoAccessPage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Package,
    Tags,
    Warehouse,
    ShoppingCart,
    Users,
    Truck,
    CreditCard,
    Layers,
    Wifi,
    WifiOff,
    RefreshCw,
    LogOut,
    Calculator,
    Settings
} from 'lucide-react';

export function DashboardLayout() {
    const { user, logout } = useAuth();
    const { isOnline, isSyncing, pendingOperations, sync } = useSync();
    const location = useLocation();
    const { t } = useTranslation();

    const navigation = [
        { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
        { name: t('nav.products'), href: '/products', icon: Package },
        { name: t('nav.categories'), href: '/categories', icon: Tags },
        { name: t('nav.stock'), href: '/stock', icon: Warehouse },
        { name: t('nav.pos'), href: '/pos', icon: Calculator },
        { name: t('nav.sales_history'), href: '/sales', icon: ShoppingCart },
        { name: t('nav.customers'), href: '/customers', icon: Users },
        { name: t('nav.suppliers'), href: '/suppliers', icon: Truck },
        { name: t('nav.supply_orders'), href: '/supplies', icon: Package },
        { name: t('nav.subscriptions'), href: '/subscriptions', icon: CreditCard },
        { name: t('nav.services'), href: '/subscriptions/offers', icon: Layers },
        { name: t('nav.settings'), href: '/settings', icon: Settings },
    ];

    const isActive = (href: string) => {
        if (href === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(href);
    };

    // Redirect to No Access page if staff has no stores
    if (user?.role === 'STAFF' && (!user.stores || user.stores.length === 0)) {
        return <NoAccessPage />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Top Navigation */}
            <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Logo & Brand */}
                        <div className="flex items-center space-x-8">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stock Management</h1>

                            {/* Store Selector */}
                            <div className="hidden md:block">
                                <StoreSelector />
                            </div>
                        </div>

                        {/* Right Side: Sync Status & User */}
                        <div className="flex items-center space-x-4">

                            <LanguageSelector />
                            <ThemeToggle />

                            {/* Sync Status */}
                            <div className="flex items-center space-x-2">
                                {isOnline ? (
                                    <Wifi className="w-5 h-5 text-green-500" />
                                ) : (
                                    <WifiOff className="w-5 h-5 text-red-500" />
                                )}
                                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                                    {isOnline ? t('nav.online') : t('nav.offline')}
                                </span>

                                {pendingOperations > 0 && (
                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                        {pendingOperations} pending
                                    </span>
                                )}

                                {isOnline && pendingOperations > 0 && (
                                    <button
                                        onClick={sync}
                                        disabled={isSyncing}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        title="Sync now"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {/* Balance Button */}
                            <Link
                                to="/subscriptions/balance"
                                className="hidden md:flex items-center space-x-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span className="text-sm font-medium">{t('nav.balance')}</span>
                            </Link>

                            {/* User Info */}
                            <div className="flex items-center space-x-3 border-l pl-4 border-gray-200 dark:border-gray-700">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title={t('nav.logout')}
                                >
                                    <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex">
                {/* Sidebar Navigation */}
                <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-4rem)] hidden md:block">
                    <nav className="p-4 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Page Content */}
                <main className="flex-1 p-8 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

