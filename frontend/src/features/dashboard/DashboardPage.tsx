import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function DashboardPage() {
    const { data: productCount } = useQuery({
        queryKey: ['stats', 'products'],
        queryFn: async () => {
            const resp = await api.get('/products');
            return resp.data?.length || 0;
        }
    });

    const { data: lowStockCount } = useQuery({
        queryKey: ['stats', 'low-stock'],
        queryFn: async () => {
            // For now, just check all stock in first store
            const orgResp = await api.get('/organizations/current');
            const storeId = orgResp.data.stores?.[0]?.id;
            if (!storeId) return 0;
            const resp = await api.get(`/stock/alerts/${storeId}`);
            return resp.data?.length || 0;
        }
    });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-600">Welcome to your stock management system</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Products</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{productCount ?? '--'}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-2">{lowStockCount ?? '--'}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">--</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">--</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link to="/sales" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group">
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">New Sale</p>
                        <p className="text-sm text-gray-600 mt-1">Create a new sale transaction</p>
                    </Link>
                    <Link to="/products" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group">
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">Add Product</p>
                        <p className="text-sm text-gray-600 mt-1">Add a new product to inventory</p>
                    </Link>
                    <Link to="/stock" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group">
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">Stock Movement</p>
                        <p className="text-sm text-gray-600 mt-1">Record stock in/out movement</p>
                    </Link>
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <p className="text-gray-500 text-center py-8">No recent activity to display</p>
            </div>
        </div>
    );
}
