import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, LogOut, CreditCard } from 'lucide-react';

export const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (user?.role !== 'GLOBAL_ADMIN') {
        return <div className="flex h-screen items-center justify-center">Access Denied</div>;
    }

    return (
        <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                <div className="p-6">
                    <h1 className="text-xl font-bold">Admin Portal</h1>
                </div>
                <nav className="px-4 space-y-2">
                    <Link to="/admin" className="flex items-center space-x-2 p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/admin/organizations" className="flex items-center space-x-2 p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Users className="w-5 h-5" />
                        <span>Organizations</span>
                    </Link>
                    <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing</div>
                    <Link to="/admin/billing/plans" className="flex items-center space-x-2 p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                        <CreditCard className="w-5 h-5" />
                        <span>Plans</span>
                    </Link>
                    <Link to="/admin/billing/subscriptions" className="flex items-center space-x-2 p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Users className="w-5 h-5" />
                        <span>Subscriptions</span>
                    </Link>
                </nav>
                <div className="absolute bottom-0 w-64 p-4 border-t">
                    <div className="mb-4">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};
