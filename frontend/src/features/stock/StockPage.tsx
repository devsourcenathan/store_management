import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '../auth/useAuth';
import { useStore } from '../stores/StoreProvider';
import { TransferModal } from './TransferModal';
import { StockAlertsList } from './components/StockAlertsList';
import { StockMovementSheet } from './components/StockMovementSheet';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from "@/components/ui/Pagination";
import { ExportButton } from '@/components/ExportButton';

interface StockMovement {
    id: string;
    productId: string;
    storeId: string;
    type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN';
    source: 'SALE' | 'SUPPLY' | 'RETURN' | 'MANUAL';
    quantity: number;
    reference?: string;
    createdAt: string;
    product: {
        name: string;
        sku: string;
    };
}

interface Product {
    id: string;
    name: string;
    sku: string;
}

export function StockPage() {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const { currentStore } = useStore();

    const queryClient = useQueryClient();
    useAuth();

    const { data: products } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await api.get('/products');
            return response.data;
        },
    });

    const { data: movements, isLoading } = useQuery<StockMovement[]>({
        queryKey: ['movements', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            // Note: storeId is automatically added by the API interceptor
            const response = await api.get('/stock/movements');
            return response.data;
        },
        enabled: !!currentStore?.id,
    });

    const {
        currentItems,
        currentPage,
        totalPages,
        goToPage: setPage,
    } = usePagination({
        totalItems: movements?.length || 0,
        itemsPerPage: 10,
    });

    const paginatedMovements = movements ? currentItems(movements) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stock.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('stock.subtitle')}</p>
                </div>
                <div className="flex flex-row gap-2 sm:gap-3">
                    <ExportButton
                        data={movements || []}
                        columns={[
                            { header: t('common.date'), key: 'createdAt' },
                            { header: t('products.fields.product'), key: 'product.name' },
                            { header: t('stock.movement_type'), key: 'type' },
                            { header: t('stock.quantity'), key: 'quantity' },
                            { header: t('stock.reference'), key: 'reference' },
                        ]}
                        title={t('stock.title')}
                        format="pdf"
                        variant="outline"
                        size="sm"
                    />
                    <ExportButton
                        data={movements || []}
                        columns={[
                            { header: t('common.date'), key: 'createdAt' },
                            { header: t('products.fields.product'), key: 'product.name' },
                            { header: t('stock.movement_type'), key: 'type' },
                            { header: t('stock.quantity'), key: 'quantity' },
                            { header: t('stock.reference'), key: 'reference' },
                        ]}
                        title={t('stock.title')}
                        format="excel"
                        variant="outline"
                        size="sm"
                    />
                    <button
                        onClick={() => setIsTransferModalOpen(true)}
                        className="w-full xs:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                    >
                        {t('stock.transfer_stock')}
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full xs:w-auto px-4 py-2 btn-theme-primary rounded-lg transition-colors whitespace-nowrap"
                    >
                        {t('stock.new_movement')}
                    </button>
                </div>
            </div>

            {/* Alerts Section */}
            {currentStore && <StockAlertsList storeId={currentStore.id} />}

            {/* Stock Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('stock.current_balance')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                        {movements?.reduce((acc, m) => {
                            const isInbound = ['IN', 'RETURN', 'ADJUST', 'SUPPLY', 'TRANSFER_IN'].includes(m.type);
                            return acc + (isInbound ? m.quantity : -m.quantity);
                        }, 0) || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('stock.total_items')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('stock.total_inbound')}</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                        {movements?.filter(m => ['IN', 'RETURN', 'ADJUST', 'SUPPLY', 'TRANSFER_IN'].includes(m.type))
                            .reduce((acc, m) => acc + m.quantity, 0) || 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('stock.total_outbound')}</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                        {movements?.filter(m => ['OUT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(m.type))
                            .reduce((acc, m) => acc + m.quantity, 0) || 0}
                    </p>
                </div>
            </div>

            {/* Recent Movements */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('stock.recent_movements')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.fields.product')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('stock.movement_type')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('stock.quantity')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('stock.reference')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedMovements.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        {t('common.no_data')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedMovements.map((movement) => (
                                    <tr key={movement.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {movement.createdAt ? new Date(movement.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {movement.product?.name}
                                            <span className="block text-xs text-gray-500">{movement.product?.sku}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${['IN', 'RETURN', 'ADJUST', 'SUPPLY', 'TRANSFER_IN'].includes(movement.type)
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {movement.type} ({movement.source})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {movement.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {movement.reference || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Movement Sheet */}
            <StockMovementSheet
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            {/* Transfer Modal */}
            {
                isTransferModalOpen && (
                    <TransferModal
                        onClose={() => setIsTransferModalOpen(false)}
                        onSuccess={() => {
                            // Movements will be invalidated by the modal
                        }}
                    />
                )
            }
        </div >
    );
}
