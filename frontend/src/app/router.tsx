import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardLayout } from '@/features/dashboard/DashboardLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { StockPage } from '@/features/stock/StockPage';
import { SalesPage } from '@/features/sales/SalesPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { CategoriesPage } from '@/features/products/CategoriesPage';
import { SuppliersPage } from '@/features/suppliers/SuppliersPage';
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage';
import { BalanceManagementPage } from '@/features/subscriptions/BalanceManagementPage';
import { OffersManagementPage } from '@/features/subscriptions/OffersManagementPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

export function AppRouter() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="subscriptions/balance" element={<BalanceManagementPage />} />
                <Route path="subscriptions/offers" element={<OffersManagementPage />} />
            </Route>
        </Routes>
    );
}
