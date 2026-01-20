import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '../auth/useAuth';
import { useStore } from '../stores/StoreProvider';
import { TransferModal } from './TransferModal';
import { StockAlertsList } from './components/StockAlertsList';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

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
    const [formData, setFormData] = useState({
        productId: '',
        type: 'IN' as const,
        source: 'MANUAL' as const,
        quantity: 0,
        reference: '',
        notes: ''
    });

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
            const response = await api.get(`/stock/movements?storeId=${currentStore.id}`);
            return response.data;
        },
        enabled: !!currentStore?.id,
    });

    const createMovementMutation = useMutation({
        mutationFn: async (newMovement: any) => {
            return api.post('/stock/movements', newMovement);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            setIsModalOpen(false);
            setFormData(prev => ({ ...prev, quantity: 0, reference: '', notes: '' }));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentStore?.id) return;
        createMovementMutation.mutate({
            ...formData,
            storeId: currentStore.id
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stock.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('stock.subtitle')}</p>
                </div>
                <div className="flex flex-row gap-2 sm:gap-3">
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
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center dark:text-gray-400">{t('common.loading')}</td></tr>
                            ) : movements?.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{t('stock.no_movements')}</td></tr>
                            ) : (
                                movements?.map((movement) => (
                                    <tr key={movement.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(movement.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {movement.product.name} ({movement.product.sku})
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${['IN', 'RETURN', 'ADJUST', 'SUPPLY', 'TRANSFER_IN'].includes(movement.type) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {movement.type} ({movement.source})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{movement.quantity}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{movement.reference || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Movement Sheet */}
            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
                <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-gray-900 dark:text-gray-100">{t('stock.new_movement_title')}</SheetTitle>
                        <SheetDescription className="text-gray-500 dark:text-gray-400">
                            {t('stock.new_movement_desc')}
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.product')}</label>
                            <select
                                required
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.productId}
                                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                            >
                                <option value="">{t('products.fields.select_category')}</option>
                                {products?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('stock.movement_type')}</label>
                                <select
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option value="IN">{t('stock.types.IN')}</option>
                                    <option value="OUT">{t('stock.types.OUT')}</option>
                                    <option value="ADJUST">{t('stock.types.ADJUST')}</option>
                                    <option value="RETURN">{t('stock.types.RETURN')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('stock.source')}</label>
                                <select
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.source}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                                >
                                    <option value="MANUAL">{t('stock.sources.MANUAL')}</option>
                                    <option value="SUPPLY">{t('stock.sources.SUPPLY')}</option>
                                    <option value="SALE">{t('stock.sources.SALE')}</option>
                                    <option value="RETURN">{t('stock.sources.RETURN')}</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('stock.quantity')}</label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('stock.reference')}</label>
                            <input
                                type="text"
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="e.g. INV-001"
                            />
                        </div>
                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={createMovementMutation.isPending || !formData.productId || !currentStore}
                                className="w-full px-4 py-3 btn-theme-primary rounded-md font-medium disabled:opacity-50 transition-colors"
                            >
                                {createMovementMutation.isPending ? t('common.processing') : t('stock.save_movement')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <TransferModal
                    onClose={() => setIsTransferModalOpen(false)}
                    onSuccess={() => {
                        // Movements will be invalidated by the modal
                    }}
                />
            )}
        </div>
    );
}
