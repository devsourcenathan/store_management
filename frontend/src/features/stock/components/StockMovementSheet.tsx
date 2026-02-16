import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useStore } from '@/features/stores/StoreProvider';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

interface Product {
    id: string;
    name: string;
    sku: string;
}

interface StockMovementSheetProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedProductId?: string;
    preselectedProductName?: string;
}

export function StockMovementSheet({
    isOpen,
    onClose,
    preselectedProductId,
    preselectedProductName
}: StockMovementSheetProps) {
    const { t } = useTranslation();
    const { currentStore } = useStore();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<{
        productId: string;
        type: 'IN' | 'OUT' | 'ADJUST' | 'RETURN' | 'SALE' | 'SUPPLY' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';
        source: 'MANUAL' | 'SALE' | 'PURCHASE' | 'TRANSFER' | 'RETURN';
        quantity: number;
        reference: string;
        notes: string;
    }>({
        productId: preselectedProductId || '',
        type: 'IN',
        source: 'MANUAL',
        quantity: 0,
        reference: '',
        notes: ''
    });

    const [productSearchQuery, setProductSearchQuery] = useState('');

    // Update productId when preselectedProductId changes
    useEffect(() => {
        if (preselectedProductId) {
            setFormData(prev => ({ ...prev, productId: preselectedProductId }));
        }
    }, [preselectedProductId]);

    const { data: products } = useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await api.get('/products');
            return response.data;
        },
    });

    // Fetch stock movements for the selected product
    const { data: stockMovements } = useQuery({
        queryKey: ['stock-movements', formData.productId, currentStore?.id],
        queryFn: async () => {
            if (!formData.productId || !currentStore?.id) return [];
            const response = await api.get(`/stock/movements?productId=${formData.productId}&storeId=${currentStore.id}`);
            return response.data;
        },
        enabled: !!formData.productId && !!currentStore?.id,
    });

    // Calculate current stock from movements
    const currentStock = useMemo(() => {
        if (!stockMovements || stockMovements.length === 0) return 0;

        return stockMovements.reduce((total: number, movement: any) => {
            if (movement.type === 'ADJUST') {
                try {
                    const meta = JSON.parse(movement.notes || '{}');
                    const direction = meta.direction || 'IN';
                    return direction === 'IN' ? total + movement.quantity : total - movement.quantity;
                } catch {
                    return total + movement.quantity;
                }
            }

            if (['IN', 'RETURN', 'SUPPLY', 'TRANSFER_IN'].includes(movement.type)) {
                return total + movement.quantity;
            } else if (['OUT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(movement.type)) {
                return total - movement.quantity;
            }

            return total;
        }, 0);
    }, [stockMovements]);

    // Calculate preview of new stock
    const previewStock = useMemo(() => {
        if (!formData.quantity || formData.quantity === 0) return currentStock;

        if (formData.type === 'ADJUST') {
            return formData.quantity; // ADJUST sets absolute value
        }

        if (['IN', 'RETURN', 'SUPPLY', 'TRANSFER_IN'].includes(formData.type)) {
            return currentStock + formData.quantity;
        } else if (['OUT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(formData.type)) {
            return currentStock - formData.quantity;
        }

        return currentStock;
    }, [currentStock, formData.quantity, formData.type]);

    // Filter products based on search query
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!productSearchQuery.trim()) return products;

        const query = productSearchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query)
        );
    }, [products, productSearchQuery]);

    const createMovementMutation = useMutation({
        mutationFn: async (newMovement: any) => {
            return api.post('/stock/movements', newMovement);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            onClose();
            setFormData({
                productId: preselectedProductId || '',
                type: 'IN',
                source: 'MANUAL',
                quantity: 0,
                reference: '',
                notes: ''
            });
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
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-gray-900 dark:text-gray-100">
                        {preselectedProductName
                            ? t('stock.new_movement_for_product', `Stock Movement - ${preselectedProductName}`)
                            : t('stock.new_movement_title')}
                    </SheetTitle>
                    <SheetDescription className="text-gray-500 dark:text-gray-400">
                        {t('stock.new_movement_desc')}
                    </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('products.fields.product')}
                        </label>

                        {!preselectedProductId ? (
                            <>
                                {/* Search input */}
                                <input
                                    type="text"
                                    placeholder={t('products.search_placeholder', 'Search by name or SKU...')}
                                    className="mt-1 mb-2 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white text-sm"
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                />

                                {/* Scrollable product list */}
                                <div className="mt-1 border border-gray-300 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto dark:bg-gray-700">
                                    {filteredProducts && filteredProducts.length > 0 ? (
                                        filteredProducts.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, productId: p.id })}
                                                className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${formData.productId === p.id
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                    : 'text-gray-900 dark:text-gray-100'
                                                    }`}
                                            >
                                                <div className="text-sm">{p.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {p.sku}</div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                                            {productSearchQuery ? t('products.no_results', 'No products found') : t('products.start_typing', 'Start typing to search...')}
                                        </div>
                                    )}
                                </div>

                                {/* Hidden input for form validation */}
                                <input
                                    type="hidden"
                                    required
                                    value={formData.productId}
                                />
                            </>
                        ) : (
                            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{preselectedProductName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Product pre-selected</div>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('stock.movement_type')}
                            </label>
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('stock.source')}
                            </label>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('stock.quantity')}
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                        />
                    </div>

                    {/* Stock Preview - only show if product is selected */}
                    {formData.productId && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('stock.preview.title', 'Stock Preview')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Current Stock */}
                                <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.preview.current', 'Current Stock')}</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentStock}</div>
                                </div>

                                {/* New Stock Preview */}
                                <div className={`rounded-md p-3 border ${formData.type === 'ADJUST'
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                                    : previewStock > currentStock
                                        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                                        : previewStock < currentStock
                                            ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                                            : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                                    }`}>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {formData.type === 'ADJUST' ? t('stock.preview.new_adjusted', 'New Stock (Adjusted)') : t('stock.preview.new', 'New Stock')}
                                    </div>
                                    <div className={`text-2xl font-bold ${formData.type === 'ADJUST'
                                        ? 'text-blue-700 dark:text-blue-300'
                                        : previewStock > currentStock
                                            ? 'text-green-700 dark:text-green-300'
                                            : previewStock < currentStock
                                                ? 'text-red-700 dark:text-red-300'
                                                : 'text-gray-900 dark:text-gray-100'
                                        }`}>
                                        {previewStock}
                                    </div>
                                    {formData.quantity > 0 && (
                                        <div className="text-xs mt-1 font-medium">
                                            {formData.type === 'ADJUST' ? (
                                                <span className="text-blue-600 dark:text-blue-400">
                                                    {t('stock.preview.set_to', 'Set to')} {formData.quantity}
                                                </span>
                                            ) : previewStock > currentStock ? (
                                                <span className="text-green-600 dark:text-green-400">
                                                    +{previewStock - currentStock}
                                                </span>
                                            ) : previewStock < currentStock ? (
                                                <span className="text-red-600 dark:text-red-400">
                                                    {previewStock - currentStock}
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('stock.reference')}
                        </label>
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
                            onClick={onClose}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
