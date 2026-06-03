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
import {
    ArrowDownLeft,
    ArrowUpRight,
    RotateCcw,
    Truck,
    ShoppingCart,
    User,
    Settings2,
    Plus,
    Minus,
    Search,
    Package
} from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku?: string | null;
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
        queryKey: ['products', currentStore?.id],
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
            // Note: storeId is automatically added by the API interceptor
            const response = await api.get('/stock/movements', {
                params: { productId: formData.productId }
            });
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
            (p.sku || '').toLowerCase().includes(query)
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
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-gray-50 dark:bg-gray-900 border-l dark:border-gray-800 p-0">
                <div className="h-full flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
                        <SheetHeader>
                            <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                {preselectedProductName ? (
                                    <>
                                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        {preselectedProductName}
                                    </>
                                ) : (
                                    t('stock.new_movement_title')
                                )}
                            </SheetTitle>
                            <SheetDescription className="text-gray-500 dark:text-gray-400">
                                {t('stock.new_movement_desc')}
                            </SheetDescription>
                        </SheetHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Product Selection (only if not preselected) */}
                            {!preselectedProductId && (
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Search className="w-4 h-4 text-gray-500" />
                                        {t('products.fields.product')}
                                    </label>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={t('products.search_placeholder', 'Search product...')}
                                            className="w-full pl-3 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                            value={productSearchQuery}
                                            onChange={(e) => setProductSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {productSearchQuery && (
                                        <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                            {filteredProducts && filteredProducts.length > 0 ? (
                                                filteredProducts.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, productId: p.id });
                                                            setProductSearchQuery(''); // Close search results
                                                        }}
                                                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group ${formData.productId === p.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                    >
                                                        <div>
                                                            <div className={`font-medium ${formData.productId === p.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>{p.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">SKU: {p.sku || '-'}</div>
                                                        </div>
                                                        {formData.productId === p.id && (
                                                            <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400 italic">
                                                    {t('products.no_results', 'No products found')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {formData.productId && !productSearchQuery && (
                                        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                                    {products?.find(p => p.id === formData.productId)?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {products?.find(p => p.id === formData.productId)?.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        SKU: {products?.find(p => p.id === formData.productId)?.sku || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, productId: '' }))}
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium px-2"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Movement Type - Grid Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {t('stock.movement_type')}
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { value: 'IN', label: t('stock.types.IN'), icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
                                        { value: 'OUT', label: t('stock.types.OUT'), icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
                                        { value: 'ADJUST', label: t('stock.types.ADJUST'), icon: Settings2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
                                        { value: 'RETURN', label: t('stock.types.RETURN'), icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
                                    ].map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: type.value as any })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.type === type.value
                                                    ? `${type.border} ${type.bg} ring-1 ring-offset-0 ring-${type.color.split('-')[1]}-500`
                                                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                                }`}
                                        >
                                            <type.icon className={`w-6 h-6 mb-2 ${formData.type === type.value ? type.color : 'text-gray-400 dark:text-gray-500'}`} />
                                            <span className={`text-xs font-semibold ${formData.type === type.value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {type.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Source - Grid Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {t('stock.source')}
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { value: 'MANUAL', label: t('stock.sources.MANUAL'), icon: User },
                                        { value: 'SUPPLY', label: t('stock.sources.SUPPLY'), icon: Truck },
                                        { value: 'SALE', label: t('stock.sources.SALE'), icon: ShoppingCart },
                                        { value: 'RETURN', label: t('stock.sources.RETURN'), icon: RotateCcw },
                                    ].map((source) => (
                                        <button
                                            key={source.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, source: source.value as any })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${formData.source === source.value
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                                                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                }`}
                                        >
                                            <source.icon className={`w-5 h-5 mb-1.5 ${formData.source === source.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                                            <span className="text-xs font-medium">{source.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quantity & Reference Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Quantity Stepper */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {t('stock.quantity')}
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(0, prev.quantity - 1) }))}
                                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                className="block w-full text-center border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm py-3 text-lg font-bold text-gray-900 dark:text-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Reference Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {t('stock.reference')} <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="block w-full border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm px-4 py-3 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={formData.reference}
                                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                        placeholder="e.g. INV-2024-001"
                                    />
                                </div>
                            </div>

                            {/* Stock Preview */}
                            {formData.productId && (
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                                        <Settings2 className="w-3 h-3" />
                                        {t('stock.preview.title', 'Simulation')}
                                    </h4>

                                    <div className="flex items-center justify-between gap-6 relative">
                                        {/* Current */}
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('stock.preview.current', 'Actuel')}</div>
                                            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{currentStock}</div>
                                        </div>

                                        {/* Arrow Indicator */}
                                        <div className="flex items-center justify-center">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${formData.quantity > 0
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                }`}>
                                                <ArrowUpRight className={`w-5 h-5 transition-transform ${formData.quantity > 0 ? 'rotate-0' : 'opacity-50'}`} />
                                            </div>
                                        </div>

                                        {/* New Predicted */}
                                        <div className="flex-1 text-right">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                {formData.type === 'ADJUST' ? t('stock.preview.new_adjusted', 'Nouveau (Ajusté)') : t('stock.preview.new', 'Nouveau')}
                                            </div>
                                            <div className={`text-3xl font-bold tracking-tight transition-colors ${previewStock > currentStock ? 'text-green-600 dark:text-green-400' :
                                                    previewStock < currentStock ? 'text-red-600 dark:text-red-400' :
                                                        'text-gray-900 dark:text-gray-100'
                                                }`}>
                                                {previewStock}
                                            </div>
                                        </div>
                                    </div>

                                    {formData.quantity > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50 flex justify-between items-center text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Impact:</span>
                                            <span className={`font-semibold ${previewStock > currentStock ? 'text-green-600 dark:text-green-400' :
                                                    previewStock < currentStock ? 'text-red-600 dark:text-red-400' :
                                                        'text-gray-500'
                                                }`}>
                                                {previewStock > currentStock ? '+' : ''}{previewStock - currentStock} {t('common.units', 'Unités')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                        </form>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 z-10 w-full">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl font-semibold transition-colors focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 outline-none"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={createMovementMutation.isPending || !formData.productId || !currentStore}
                                className="flex-[2] py-3.5 px-4 btn-theme-primary rounded-xl font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 outline-none"
                            >
                                {createMovementMutation.isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {t('common.processing')}
                                    </span>
                                ) : (
                                    t('stock.save_movement')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
