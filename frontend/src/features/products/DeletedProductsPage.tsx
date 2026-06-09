import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { RotateCcw, Package, Calendar } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/apiBaseUrl';
import { useStore } from '@/features/stores/StoreProvider';

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    category?: {
        id: string;
        name: string;
    };
    media?: Array<{
        id: string;
        url: string;
        filename: string;
    }>;
    deletedInStores?: Array<{
        deletedAt: string;
        deletedBy: string | null;
    }>;
}

export function DeletedProductsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    // Fetch deleted products
    const { data: deletedProducts = [], isLoading } = useQuery({
        queryKey: ['products', 'deleted', currentStore?.id],
        queryFn: async () => {
            const response = await api.get('/products/deleted', {
                headers: { 'x-store-id': currentStore?.id }
            });
            return response.data;
        },
        enabled: !!currentStore?.id,
    });

    // Restore product mutation
    const restoreProductMutation = useMutation({
        mutationFn: async (id: string) => {
            const storeId = localStorage.getItem('current_store_id');
            return api.post(`/products/${id}/restore`, {}, {
                headers: { 'x-store-id': storeId }
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['products', 'deleted'] });
            toast.success(t('products.restore_success', 'Product restored successfully'));
        },
        onError: () => {
            toast.error(t('products.restore_error', 'Failed to restore product'));
        }
    });

    const handleRestore = (id: string, productName: string) => {
        if (confirm(t('products.restore_confirm', `Are you sure you want to restore "${productName}"?`))) {
            restoreProductMutation.mutate(id);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t('products.deleted_products', 'Deleted Products')}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('products.deleted_products_description', 'Products deleted in the current store')}
                    </p>
                </div>
                <Link
                    to="/products"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                    {t('common.back', 'Back to Products')}
                </Link>
            </div>

            {/* Deleted Products Table */}
            {deletedProducts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {t('products.no_deleted_products', 'No Deleted Products')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('products.no_deleted_products_description', 'There are no deleted products in this store.')}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('products.product', 'Product')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('products.sku', 'SKU')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('products.category', 'Category')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('products.price', 'Price')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('products.deleted_at', 'Deleted At')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {t('common.actions', 'Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {deletedProducts.map((product: Product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {product.media && product.media.length > 0 ? (
                                                    <img
                                                        src={resolveMediaUrl(product.media[0].url)}
                                                        alt={product.name}
                                                        className="w-10 h-10 rounded object-cover mr-3"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                                                        <Package className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {product.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {product.sku}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {product.category?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {Number(product.basePrice).toFixed(2)} FCFA
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {product.deletedInStores && product.deletedInStores.length > 0
                                                    ? formatDate(product.deletedInStores[0].deletedAt)
                                                    : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleRestore(product.id, product.name)}
                                                disabled={restoreProductMutation.isPending}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                {t('common.restore', 'Restore')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
