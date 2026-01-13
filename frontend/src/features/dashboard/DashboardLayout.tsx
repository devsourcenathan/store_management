import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useSync } from '@/offline/SyncProvider';
import { StoreSelector } from '@/features/stores/StoreSelector';
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
    Calculator
} from 'lucide-react';

export function DashboardLayout() {
    const { user, logout } = useAuth();
    const { isOnline, isSyncing, pendingOperations, sync } = useSync();
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Categories', href: '/categories', icon: Tags },
        { name: 'Stock', href: '/stock', icon: Warehouse },
        { name: 'Point of Sale', href: '/pos', icon: Calculator },
        { name: 'Sales History', href: '/sales', icon: ShoppingCart },
        { name: 'Customers', href: '/customers', icon: Users },
        { name: 'Suppliers', href: '/suppliers', icon: Truck },
        { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
        { name: 'Offers & Services', href: '/subscriptions/offers', icon: Layers }, // Added this item
    ];

    const isActive = (href: string) => {
        if (href === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Logo & Brand */}
                        <div className="flex items-center space-x-8">
                            <h1 className="text-xl font-bold text-gray-900">Stock Management</h1>

                            {/* Store Selector */}
                            <div className="hidden md:block">
                                <StoreSelector />
                            </div>
                        </div>

                        {/* Right Side: Sync Status & User */}
                        <div className="flex items-center space-x-4">
                            {/* Sync Status */}
                            <div className="flex items-center space-x-2">
                                {isOnline ? (
                                    <Wifi className="w-5 h-5 text-green-500" />
                                ) : (
                                    <WifiOff className="w-5 h-5 text-red-500" />
                                )}
                                <span className="text-sm text-gray-600">
                                    {isOnline ? 'Online' : 'Offline'}
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
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Sync now"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {/* Balance Button */}
                            <Link
                                to="/subscriptions/balance"
                                className="hidden md:flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span className="text-sm font-medium">Balance</span>
                            </Link>

                            {/* User Info */}
                            <div className="flex items-center space-x-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-xs text-gray-500">{user?.role}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex">
                {/* Sidebar Navigation */}
                <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
                    <nav className="p-4 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-50'
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
                <main className="flex-1 p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
