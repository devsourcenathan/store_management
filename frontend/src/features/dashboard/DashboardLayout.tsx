import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useSync } from '@/offline/SyncProvider';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTheme } from '@/components/ThemeProvider';
import { StoreSelector } from '@/features/stores/StoreSelector';
import { NoAccessPage } from '@/features/auth/NoAccessPage';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { MobileMenu } from '@/components/MobileMenu';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
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
    Settings,
    Menu,
    Shield,
    Image,
    BarChart3,
    Store
} from 'lucide-react';

export function DashboardLayout() {
    const { user, logout } = useAuth();
    const { isOnline, isSyncing, pendingOperations, sync } = useSync();
    const { organization } = useOrganization();
    const { theme } = useTheme();
    const location = useLocation();
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Determine if dark mode is active
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const groupedNavigation = [
        {
            title: 'Overview',
            items: [
                { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
            ]
        },
        {
            title: 'Commercial',
            items: [
                { name: t('nav.sales_history'), href: '/sales', icon: ShoppingCart },
                { name: t('nav.pos'), href: '/pos', icon: Calculator },
                { name: t('nav.customers'), href: '/customers', icon: Users },
                { name: t('nav.suppliers'), href: '/suppliers', icon: Truck },
                { name: t('nav.supply_orders'), href: '/supplies', icon: Package },
            ]
        },
        {
            title: 'Inventory',
            items: [
                { name: t('nav.products'), href: '/products', icon: Package },
                { name: t('nav.categories'), href: '/categories', icon: Tags },
                { name: t('nav.stock'), href: '/stock', icon: Warehouse },
            ]
        },
        {
            title: 'Finance',
            items: [
                { name: t('nav.subscriptions'), href: '/subscriptions', icon: CreditCard },
                { name: t('nav.services'), href: '/subscriptions/offers', icon: Layers },
            ]
        },
        {
            title: 'Content',
            items: [
                { name: t('nav.media'), href: '/media', icon: Image },
            ]
        }
    ];

    // Settings - Only for OWNER and MANAGER
    if (user?.role === 'OWNER' || user?.role === 'MANAGER') {
        groupedNavigation.push({
            title: 'Settings',
            items: [
                { name: t('nav.settings'), href: '/settings', icon: Settings },
            ]
        });
    }

    if (user?.role === 'GLOBAL_ADMIN') {
        groupedNavigation.push({
            title: 'Admin',
            items: [{ name: 'Admin Panel', href: '/admin', icon: Shield }]
        });
    }

    if (user?.role === 'OWNER') {
        groupedNavigation.splice(1, 0, {
            title: 'Analytics',
            items: [{ name: t('nav.statistics'), href: '/statistics', icon: BarChart3 }]
        });
    }

    const isActive = (href: string) => {
        if (href === '/dashboard' && location.pathname === '/') {
            return false; // Don't highlight dashboard on landing page if somehow rendered
        }
        return location.pathname.startsWith(href);
    };

    // Redirect to No Access page if staff has no stores
    if (user?.role === 'STAFF' && (!user.stores || user.stores.length === 0)) {
        return <NoAccessPage />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Mobile Menu */}
            <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                navigation={groupedNavigation}
            />

            {/* Top Navigation */}
            <nav
                className="shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30"
                style={{
                    backgroundColor: isDark
                        ? organization?.themeConfig?.navbarBgDark
                        : organization?.themeConfig?.navbarBgLight
                }}
            >
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex justify-between h-14 sm:h-16">
                        {/* Logo & Brand */}
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target"
                                aria-label="Open menu"
                            >
                                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </button>

                            {/* Organization Logo & Name */}
                            <div className="flex items-center space-x-2">
                                {organization?.logoUrl && (
                                    <img
                                        src={organization.logoUrl}
                                        alt={organization.name}
                                        className="h-8 w-8 object-contain"
                                    />
                                )}
                                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {organization?.name || 'Stock Management'}
                                </h1>
                            </div>

                            {/* Store Selector - Desktop */}
                            <div className="hidden md:block">
                                <StoreSelector />
                            </div>
                        </div>

                        {/* Right Side: Sync Status & User */}
                        <div className="flex items-center space-x-1 sm:space-x-3">
                            {/* Desktop: Language & Theme visible */}
                            <div className="hidden md:flex items-center space-x-2">
                                <LanguageSelector />
                                <ThemeToggle />
                            </div>

                            {/* Mobile: More Menu Dropdown */}
                            <div className="md:hidden relative">
                                <button
                                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    aria-label="More options"
                                >
                                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {isMoreMenuOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsMoreMenuOpen(false)}
                                        />

                                        {/* Menu */}
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                                            {/* User Info - First */}
                                            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                                                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                            {user?.firstName} {user?.lastName}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Store Selector */}
                                            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Store</span>
                                                    <StoreSelector />
                                                </div>
                                            </div>

                                            {/* Balance - More prominent */}
                                            <Link
                                                to="/subscriptions/balance"
                                                onClick={() => setIsMoreMenuOpen(false)}
                                                className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                                        <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('nav.balance')}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage credits</p>
                                                    </div>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>

                                            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Language</span>
                                                    <LanguageSelector />
                                                </div>
                                            </div>

                                            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Theme</span>
                                                    <ThemeToggle />
                                                </div>
                                            </div>



                                            {/* Logout */}
                                            <div className="px-3 py-2">
                                                <button
                                                    onClick={() => {
                                                        setIsMoreMenuOpen(false);
                                                        logout();
                                                    }}
                                                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{t('nav.logout')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Sync Status */}
                            <div className="flex items-center space-x-1 sm:space-x-2">
                                {isOnline ? (
                                    <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                                ) : (
                                    <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                )}
                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden lg:inline">
                                    {isOnline ? t('nav.online') : t('nav.offline')}
                                </span>

                                {pendingOperations > 0 && (
                                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full hidden sm:inline">
                                        {pendingOperations}
                                    </span>
                                )}

                                {isOnline && pendingOperations > 0 && (
                                    <button
                                        onClick={sync}
                                        disabled={isSyncing}
                                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-target"
                                        title="Sync now"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {/* Balance Button - Desktop only */}
                            <Link
                                to="/subscriptions/balance"
                                className="hidden md:flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span className="text-xs sm:text-sm font-medium">{t('nav.balance')}</span>
                            </Link>

                            {/* User Info - Desktop */}
                            <div className="relative hidden md:block border-l pl-2 sm:pl-4 border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center space-x-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                                >
                                    <div className="text-right hidden lg:block">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.firstName} {user?.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
                                    </div>
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-500 transition-all">
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                                        </span>
                                    </div>
                                </button>

                                {isUserMenuOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsUserMenuOpen(false)}
                                        />

                                        {/* Dropdown */}
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 lg:hidden">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {user?.firstName} {user?.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    logout();
                                                }}
                                                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>{t('nav.logout')}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex">
                {/* Sidebar Navigation */}
                <aside
                    className="w-64 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-4rem)] hidden md:block"
                    style={{
                        backgroundColor: isDark
                            ? organization?.themeConfig?.sidebarBgDark
                            : organization?.themeConfig?.sidebarBgLight
                    }}
                >
                    <nav className="p-4 overflow-y-auto">
                        {groupedNavigation.map((group, groupIndex) => (
                            <div key={groupIndex} className="mb-6 last:mb-0">
                                {group.title && (
                                    <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {group.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const active = isActive(item.href);

                                        return (
                                            <Link
                                                key={item.href}
                                                to={item.href}
                                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active
                                                    ? ''
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                    }`}
                                                style={active ? {
                                                    backgroundColor: organization?.themeConfig?.primaryColor
                                                        ? `${organization.themeConfig.primaryColor}20`
                                                        : undefined,
                                                    color: organization?.themeConfig?.primaryColor || undefined
                                                } : undefined}
                                            >
                                                <Icon className="w-5 h-5 flex-shrink-0" />
                                                <span className="font-medium">{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>

            {/* Offline Indicator */}
            <OfflineIndicator />

            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
        </div>
    );
}

