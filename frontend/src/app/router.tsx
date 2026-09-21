import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
// Perf Phase 1: only the login + shell stay in the initial bundle.
// Every other page is lazy-loaded so Vercel serves a small first chunk.
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardLayout } from '@/features/dashboard/DashboardLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';

const RegisterPage = lazy(() => import('@/features/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const StockPage = lazy(() => import('@/features/stock/StockPage').then(m => ({ default: m.StockPage })));
const SalesPage = lazy(() => import('@/features/sales/SalesPage').then(m => ({ default: m.SalesPage })));
const PosPage = lazy(() => import('@/features/sales/PosPage').then(m => ({ default: m.PosPage })));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CategoriesPage = lazy(() => import('@/features/products/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const DeletedProductsPage = lazy(() => import('@/features/products/DeletedProductsPage').then(m => ({ default: m.DeletedProductsPage })));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/SubscriptionsPage').then(m => ({ default: m.SubscriptionsPage })));
const BalanceManagementPage = lazy(() => import('@/features/subscriptions/BalanceManagementPage').then(m => ({ default: m.BalanceManagementPage })));
const OffersManagementPage = lazy(() => import('@/features/subscriptions/OffersManagementPage').then(m => ({ default: m.OffersManagementPage })));
const SupplyOrdersPage = lazy(() => import('@/features/suppliers/SupplyOrdersPage').then(m => ({ default: m.SupplyOrdersPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PermissionsPage = lazy(() => import('@/features/settings/PermissionsPage').then(m => ({ default: m.PermissionsPage })));
const MediaLibrary = lazy(() => import('@/features/media/MediaLibrary').then(m => ({ default: m.MediaLibrary })));
const OwnerStatisticsPage = lazy(() => import('@/features/statistics/OwnerStatisticsPage').then(m => ({ default: m.OwnerStatisticsPage })));
const PricingPage = lazy(() => import('@/features/billing/PricingPage'));
const SubscriptionPage = lazy(() => import('@/features/billing/SubscriptionPage'));
const BillingCallbackPage = lazy(() => import('@/features/billing/BillingCallbackPage'));
const DevicesPage = lazy(() => import('@/features/devices/DevicesPage').then(m => ({ default: m.DevicesPage })));
const MaintenancesPage = lazy(() => import('@/features/maintenances/MaintenancesPage').then(m => ({ default: m.MaintenancesPage })));
const AuditLogsPage = lazy(() => import('@/features/audit/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const UserAnalyticsPage = lazy(() => import('@/features/analytics/UserAnalyticsPage').then(m => ({ default: m.UserAnalyticsPage })));
const StoreList = lazy(() => import('@/features/settings/components/StoreList').then(m => ({ default: m.StoreList })));
const CashAdjustmentsList = lazy(() => import('@/features/cash-adjustments/pages/CashAdjustmentsList').then(m => ({ default: m.CashAdjustmentsList })));
const MiscTransactionsList = lazy(() => import('@/features/misc-transactions/pages/MiscTransactionsList').then(m => ({ default: m.MiscTransactionsList })));

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

const LandingPage = lazy(() => import('@/features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const RegisterOrgPage = lazy(() => import('@/features/landing/RegisterOrgPage').then(m => ({ default: m.RegisterOrgPage })));
const OrgLandingPage = lazy(() => import('@/features/org-landing/OrgLandingPage').then(m => ({ default: m.OrgLandingPage })));
const OrgLandingEditor = lazy(() => import('@/features/org-landing/OrgLandingEditor').then(m => ({ default: m.OrgLandingEditor })));

const AdminLayout = lazy(() => import('@/features/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const OrgList = lazy(() => import('@/features/admin/OrgList').then(m => ({ default: m.OrgList })));
const AdminPlansPage = lazy(() => import('@/features/billing/AdminPlansPage'));
const AdminSubscriptionsPage = lazy(() => import('@/features/billing/AdminSubscriptionsPage'));

function LazyFallback() {
    return <div className="flex items-center justify-center min-h-[40vh]">Loading...</div>;
}

export function AppRouter() {
    return (
        <Suspense fallback={<LazyFallback />}>
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
                    <Route path="cash-adjustments" element={<CashAdjustmentsList />} />
                    <Route path="misc-transactions" element={<MiscTransactionsList />} />

                    <Route path="audit-logs" element={<AuditLogsPage />} />
                    <Route path="user-analytics" element={<UserAnalyticsPage />} />


                    {/* Platform Billing */}
                    <Route path="billing/pricing" element={<PricingPage />} />
                    <Route path="billing/subscription" element={<SubscriptionPage />} />
                    <Route path="billing/callback" element={<BillingCallbackPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}
