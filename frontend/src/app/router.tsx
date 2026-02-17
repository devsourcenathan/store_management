import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { DashboardLayout } from '@/features/dashboard/DashboardLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { StockPage } from '@/features/stock/StockPage';
import { SalesPage } from '@/features/sales/SalesPage';
import { PosPage } from '@/features/sales/PosPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { CategoriesPage } from '@/features/products/CategoriesPage';
import { DeletedProductsPage } from '@/features/products/DeletedProductsPage';
import { SuppliersPage } from '@/features/suppliers/SuppliersPage';
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage';
import { BalanceManagementPage } from '@/features/subscriptions/BalanceManagementPage';
import { OffersManagementPage } from '@/features/subscriptions/OffersManagementPage';
import { SupplyOrdersPage } from '@/features/suppliers/SupplyOrdersPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PermissionsPage } from '@/features/settings/PermissionsPage';
import { MediaLibrary } from '@/features/media/MediaLibrary';
import { OwnerStatisticsPage } from '@/features/statistics/OwnerStatisticsPage';
import PricingPage from '@/features/billing/PricingPage';
import SubscriptionPage from '@/features/billing/SubscriptionPage';
import BillingCallbackPage from '@/features/billing/BillingCallbackPage';
import { DevicesPage } from '@/features/devices/DevicesPage';
import { MaintenancesPage } from '@/features/maintenances/MaintenancesPage';
import { AuditLogsPage } from '@/features/audit/AuditLogsPage';
import { UserAnalyticsPage } from '@/features/analytics/UserAnalyticsPage';
import { StoreList } from '@/features/settings/components/StoreList';

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

import { LandingPage } from '@/features/landing/LandingPage';
import { RegisterOrgPage } from '@/features/landing/RegisterOrgPage';
import { OrgLandingPage } from '@/features/org-landing/OrgLandingPage';
import { OrgLandingEditor } from '@/features/org-landing/OrgLandingEditor';

import { AdminLayout } from '@/features/admin/AdminLayout';
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { OrgList } from '@/features/admin/OrgList';
import AdminPlansPage from '@/features/billing/AdminPlansPage';
import AdminSubscriptionsPage from '@/features/billing/AdminSubscriptionsPage';

export function AppRouter() {
    return (
        <Routes>
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="organizations" element={<OrgList />} />
                <Route path="billing/plans" element={<AdminPlansPage />} />
                <Route path="billing/subscriptions" element={<AdminSubscriptionsPage />} />
            </Route>

            {/* <Route path="/" element={<LandingPage />} /> */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/register-org" element={<RegisterOrgPage />} />
            <Route path="/org/:subdomain" element={<OrgLandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/deleted" element={<DeletedProductsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="stock" element={<StockPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="pos" element={<PosPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="supplies" element={<SupplyOrdersPage />} />
                <Route path="subscriptions" element={<SubscriptionsPage />} />
                <Route path="subscriptions/balance" element={<BalanceManagementPage />} />
                <Route path="subscriptions/offers" element={<OffersManagementPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/permissions" element={<PermissionsPage />} />
                <Route path="settings/landing" element={<OrgLandingEditor />} />
                <Route path="media" element={<MediaLibrary />} />
                <Route path="statistics" element={<OwnerStatisticsPage />} />
                <Route path="devices" element={<DevicesPage />} />
                <Route path="maintenances" element={<MaintenancesPage />} />

                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="user-analytics" element={<UserAnalyticsPage />} />


                {/* Platform Billing */}
                <Route path="billing/pricing" element={<PricingPage />} />
                <Route path="billing/subscription" element={<SubscriptionPage />} />
                <Route path="billing/callback" element={<BillingCallbackPage />} />
            </Route>
        </Routes>
    );
}
