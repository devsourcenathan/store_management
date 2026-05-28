import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { Package, Image as ImageIcon, Edit, Trash2, Plus, TrendingUp, PackagePlus, Search, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MediaSelector } from '@/features/media/components/MediaSelector';
import { toast } from 'sonner';
import { mediaService, Media } from '@/services/mediaService';
import { useStore } from '@/features/stores/StoreProvider';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { ExportButton } from '@/components/ExportButton';
import { StockMovementSheet } from '@/features/stock/components/StockMovementSheet';

interface Product {
    id: string;
    name: string;
    sku?: string | null;
    description?: string;
    basePrice: number;
    costPrice: number;
    minStock: number;
    isActive: boolean;
    categoryId?: string;
    category?: {
        id: string;
        name: string;
    };
    media?: Media[];
    stockLevels?: Array<{
        storeId: string;
        quantity: number;
    }>;
    time: number; // For forcing re-render if needed
}

export function ProductsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({ name: '', sku: '', basePrice: 0, costPrice: 0, minStock: 10, initialStock: 0, categoryId: '' });
    const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
    const { currentStore } = useStore();
    const [isStockMovementOpen, setIsStockMovementOpen] = useState(false);
    const [selectedProductForStock, setSelectedProductForStock] = useState<{ id: string; name: string } | null>(null);
    const queryClient = useQueryClient();

    const { t } = useTranslation();



    const [searchQuery, setSearchQuery] = useState('');
    const [activeSearchQuery, setActiveSearchQuery] = useState(''); // Actually applied search
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Handle search button click
    const handleSearch = () => {
        setIsSearching(true);
        setActiveSearchQuery(searchQuery);
    };

    // Handle Enter key in search input
    const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const { data: products, isLoading, isFetching, refetch } = useQuery<any[]>({
        queryKey: ['products', currentStore?.id, activeSearchQuery, selectedCategoryId, sortBy, sortOrder],
        queryFn: async () => {
            const params: any = {};
            if (activeSearchQuery) params.search = activeSearchQuery;
            if (selectedCategoryId) params.categoryId = selectedCategoryId;
            params.sortBy = sortBy;
            params.sortOrder = sortOrder;

            const headers: any = {};
            if (currentStore?.id) {
                headers['x-store-id'] = currentStore.id;
            }

            const response = await api.get('/products', { params, headers });
            const prods = response.data;

            // Fetch stock for each product if a store is selected
            if (currentStore?.id) {
                // Note: storeId is automatically added by the API interceptor
                const stockResponse = await api.get('/stock/movements');
                const movements = stockResponse.data;

                return prods.map((p: any) => {
                    const productMovements = movements.filter((m: any) => m.productId === p.id);
                    const quantity = productMovements.reduce((acc: number, m: any) => {
                        // Handle ADJUST type by reading direction from notes
                        if (m.type === 'ADJUST') {
                            try {
                                const meta = JSON.parse(m.notes || '{}');
                                const direction = meta.direction || 'IN';
                                return direction === 'IN' ? acc + m.quantity : acc - m.quantity;
                            } catch {
                                // Fallback for old data without JSON notes
                                return acc + m.quantity;
                            }
                        }

                        // Handle other movement types
                        if (m.type === 'IN' || m.type === 'RETURN' || m.type === 'SUPPLY' || m.type === 'TRANSFER_IN') {
                            return acc + m.quantity;
                        } else if (m.type === 'OUT' || m.type === 'SALE' || m.type === 'TRANSFER_OUT' || m.type === 'ADJUSTMENT') {
                            return acc - m.quantity;
                        }

                        return acc;
                    }, 0);

                    return { ...p, quantity };
                });
            }
            return prods;
        },
        enabled: !!currentStore?.id,
    });

    // Reset searching state when query completes
    useEffect(() => {
        if (!isFetching) {
            setIsSearching(false);
        }
    }, [isFetching]);

    const { data: categories } = useQuery<any[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await api.get('/categories');
            return response.data;
        },
    });


    const {
        currentItems,
        currentPage,
        totalPages,
        goToPage: setPage,
    } = usePagination({
        totalItems: products?.length || 0,
        itemsPerPage: 10,
    });

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSearchQuery, selectedCategoryId, sortBy, sortOrder]);

    const paginatedProducts = products && products.length > 0 ? currentItems(products) : [];

    const createProductMutation = useMutation({
        mutationFn: async (newProduct: any) => {
            const response = await api.post('/products', newProduct);
            return response.data;
        },
        onSuccess: async (createdProduct) => {
            if (selectedMedia.length > 0) {
                await Promise.all(selectedMedia.map(m =>
                    mediaService.linkToEntity(m.id, 'PRODUCT', createdProduct.id)
                ));
            }
            // Invalidate both products and stock movements to refresh stock column
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['stock'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const updateProductMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            return api.patch(`/products/${id}`, data);
        },
        onSuccess: async () => {
            // Invalidate both products and stock movements to refresh stock column
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['stock'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const deleteProductMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!confirm(t('products.delete_confirm'))) throw new Error('Cancelled');
            const storeId = localStorage.getItem('current_store_id');
            return api.delete(`/products/${id}`, {
                headers: { 'x-store-id': storeId }
            });
        },
        onSuccess: async () => {
            // Invalidate both products and stock movements to refresh stock column
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['stock'] });
            toast.success(t('products.delete_success', 'Product deleted successfully'));
        },
        onError: (error) => {
            if (error.message !== 'Cancelled') {
                toast.error(t('products.delete_error'));
            }
        }
    });

    const resetForm = () => {
        setFormData({ name: '', sku: '', basePrice: 0, costPrice: 0, minStock: 10, initialStock: 0, categoryId: '' });
        setSelectedMedia([]);
        setEditingProduct(null);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku || '',
            basePrice: Number(product.basePrice),
            costPrice: Number(product.costPrice || 0),
            minStock: product.minStock || 10,
            initialStock: 0,
            categoryId: product.categoryId || product.category?.id || '',
        });
        setSelectedMedia(product.media || []);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        deleteProductMutation.mutate(id);
    };

    const handleOpenStockMovement = (product: Product) => {
        setSelectedProductForStock({ id: product.id, name: product.name });
        setIsStockMovementOpen(true);
    };

    const handleCloseStockMovement = () => {
        setIsStockMovementOpen(false);
        setSelectedProductForStock(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const normalizedSku = (formData.sku || '').trim();
        const payload = {
            ...formData,
            sku: normalizedSku.length > 0 ? normalizedSku : null,
            // On create: masquer prix d'achat et le caler sur prix de vente
            costPrice: editingProduct ? formData.costPrice : formData.basePrice,
        };

        // Client-side validation
        // if (!formData.categoryId) {
        //     toast.error(t('products.errors.category_required') || 'Please select a category');
        //     return;
        // }

        if (editingProduct) {
            updateProductMutation.mutate({ id: editingProduct.id, data: payload });
        } else {
            if (!currentStore?.id) {
                toast.error(t('products.errors.no_store_selected') || 'Please select a store');
                return;
            }
            createProductMutation.mutate({ ...payload, storeId: currentStore.id });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('products.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('products.subtitle')}</p>
                </div>
                <div className="flex flex-row gap-2 sm:gap-3">
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center"
                        title={t('common.refresh', 'Refresh')}
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                    <ExportButton
                        data={products || []}
                        columns={[
                            { header: t('products.fields.name'), key: 'name' },
                            { header: t('products.fields.sku'), key: 'sku' },
                            { header: t('products.fields.category'), key: 'category.name' },
                            { header: t('products.fields.price'), key: 'basePrice' },
                            { header: t('products.fields.stock'), key: 'quantity' },
                        ]}
                        title={t('products.title')}
                        format="pdf"
                        variant="outline"
                        size="sm"
                    />
                    <ExportButton
                        data={products || []}
                        columns={[
                            { header: t('products.fields.name'), key: 'name' },
                            { header: t('products.fields.sku'), key: 'sku' },
                            { header: t('products.fields.category'), key: 'category.name' },
                            { header: t('products.fields.price'), key: 'basePrice' },
                            { header: t('products.fields.stock'), key: 'quantity' },
                        ]}
                        title={t('products.title')}
                        format="excel"
                        variant="outline"
                        size="sm"
                        className="hidden xs:inline-flex"
                    />



                    <button
                        onClick={() => {
                            setSelectedProductForStock(null);
                            setIsStockMovementOpen(true);
                        }}
                        className="px-3 sm:px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors text-sm sm:text-base touch-target w-full xs:w-auto flex items-center justify-center whitespace-nowrap"
                    >
                        <PackagePlus className="w-4 h-4 sm:inline-block mr-0 sm:mr-2" />
                        <span className="hidden xs:inline">{t('stock.new_movement', 'Stock Movement')}</span>
                        <span className="xs:hidden">{t('stock.movement', 'Stock')}</span>
                    </button>


                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-3 sm:px-4 py-2 btn-theme-primary rounded-lg transition-colors text-sm sm:text-base touch-target w-full xs:w-auto flex items-center justify-center whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 sm:inline-block mr-0 sm:mr-2" />
                        <span className="hidden xs:inline">{t('products.add_product')}</span>
                        <span className="xs:hidden">{t('common.add')}</span>
                    </button>

                    <Link
                        to="/products/deleted"
                        className="px-3 sm:px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm sm:text-base touch-target w-full xs:w-auto flex items-center justify-center whitespace-nowrap border border-gray-300 dark:border-gray-600"
                    >
                        <Trash2 className="w-4 h-4 sm:inline-block mr-0 sm:mr-2" />
                        <span className="hidden xs:inline">{t('products.deleted_products', 'Deleted Products')}</span>
                        <span className="xs:hidden">{t('common.deleted', 'Deleted')}</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.search')}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder={t('products.search_placeholder', 'Search by name or SKU...')}
                            className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleSearchKeyPress}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isFetching}
                            className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors flex items-center justify-center"
                            title={isFetching ? t('common.searching', 'Searching...') : t('common.search', 'Search')}
                        >
                            {isFetching ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
                <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('products.fields.category')}</label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                        <option value="">{t('common.all')}</option>
                        {categories?.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full sm:w-40">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.sort_by')}</label>
                    <select
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="name">{t('products.fields.name')}</option>
                        <option value="basePrice">{t('products.fields.price')}</option>
                        <option value="createdAt">{t('common.date')}</option>
                    </select>
                </div>
                <div className="w-full sm:w-24">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.order')}</label>
                    <button
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 flex items-center justify-center"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                        {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                    </button>
                </div>
            </div>

            {/* Products Display - Cards on Mobile, Table on Desktop */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
                {/* Mobile Card View */}
                {/* Product List with Pagination */}
                <div className="md:hidden p-4 space-y-4">
                    {isLoading || (products && products.length > 0 && isFetching) ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center flex-1 min-w-0">
                                        <Skeleton className="h-12 w-12 rounded-lg" />
                                        <div className="ml-3 flex-1 min-w-0 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-2">
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <div>
                                        <Skeleton className="h-3 w-16 mb-1" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                    <div>
                                        <Skeleton className="h-3 w-16 mb-1" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                    <div>
                                        <Skeleton className="h-3 w-16 mb-1" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : paginatedProducts.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                            {t('products.no_products')}
                        </div>
                    ) : (
                        paginatedProducts.map((product: any) => (
                            <div key={product.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                                {/* Product Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center flex-1 min-w-0">
                                        <div className="flex-shrink-0 h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 overflow-hidden">
                                            {product.media && product.media.length > 0 ? (
                                                <img
                                                    src={product.media[0].url}
                                                    alt={product.media[0].alt || product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {product.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                SKU: {product.sku || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center space-x-2 ml-2">
                                        <button
                                            onClick={() => handleOpenStockMovement(product)}
                                            className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                            title={t('stock.new_movement', 'Stock Movement')}
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="p-2 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Product Details Grid */}
                                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                                            {t('products.fields.category')}
                                        </p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {product.category?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                                            {t('products.fields.stock')}
                                        </p>
                                        <div className="flex items-center space-x-1">
                                            <Package className={`w-4 h-4 ${product.quantity <= 10 ? 'text-red-500' : 'text-green-500'}`} />
                                            <span className={`text-sm font-semibold ${product.quantity <= 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                {product.quantity ?? 0}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                                            {t('products.fields.price')}
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {product.basePrice} F
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.fields.product')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.fields.category')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.fields.stock')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.fields.price')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.fields.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading || (products && products.length > 0 && isFetching) ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <Skeleton className="h-10 w-10 rounded" />
                                                <div className="ml-4 space-y-1">
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="h-3 w-20" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-1">
                                                <Skeleton className="h-4 w-4 mr-1" />
                                                <Skeleton className="h-4 w-8" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-3">
                                            <Skeleton className="h-4 w-4" />
                                            <Skeleton className="h-4 w-4" />
                                            <Skeleton className="h-4 w-4" />
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {t('products.no_products')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map((product: any) => (
                                    <tr key={product.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 overflow-hidden">
                                                    {product.media && product.media.length > 0 ? (
                                                        <img
                                                            src={product.media[0].url}
                                                            alt={product.media[0].alt || product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6" />
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{product.sku || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.category?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center space-x-1 outline-none">
                                                <Package className={`w-4 h-4 ${product.quantity <= 10 ? 'text-red-500' : 'text-green-500'}`} />
                                                <span className={product.quantity <= 10 ? 'text-red-600 dark:text-red-400 font-bold' : 'dark:text-gray-300'}>
                                                    {product.quantity ?? 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.basePrice} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleOpenStockMovement(product)}
                                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                                                title={t('stock.new_movement', 'Stock Movement')}
                                            >
                                                <TrendingUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
            />

            {/* Add/Edit Product Sheet */}
            <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
                <SheetContent className="overflow-y-auto w-[400px] sm:w-[700px]">
                    <SheetHeader>
                        <SheetTitle>{editingProduct ? t('products.edit_product') : t('products.add_product')}</SheetTitle>
                        <SheetDescription>
                            {editingProduct ? t('products.edit_description', 'Edit product details below.') : t('products.add_description', 'Add a new product to your inventory.')}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.name')}</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('products.fields.sku')} <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.base_price')}</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.basePrice}
                                        onChange={(e) => {
                                            const nextBasePrice = e.target.value === '' ? 0 : Number(e.target.value);
                                            // Lors de l'ajout: garder costPrice = basePrice en arrière-plan
                                            setFormData(prev => (editingProduct ? { ...prev, basePrice: nextBasePrice } : { ...prev, basePrice: nextBasePrice, costPrice: nextBasePrice }));
                                        }}
                                    />
                                </div>
                                {/* {editingProduct ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.cost_price')}</label>
                                        <input
                                            type="number"
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        />
                                    </div>
                                ) : (
                                    <input type="hidden" value={formData.costPrice} readOnly />
                                )} */}
                            </div>
                            {!editingProduct && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.initial_stock')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.initialStock}
                                        onChange={(e) => setFormData({ ...formData, initialStock: parseFloat(e.target.value) })}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.min_stock')}</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.category')} <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                >
                                    <option value="">{t('products.fields.select_category')}</option>
                                    {categories?.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image</label>
                                <MediaSelector
                                    entityType="PRODUCT"
                                    entityId={editingProduct?.id || ''}
                                    selectedMedia={selectedMedia}
                                    onSelect={async (media) => {
                                        if (editingProduct) {
                                            await mediaService.linkToEntity(media.id, 'PRODUCT', editingProduct.id);
                                            queryClient.invalidateQueries({ queryKey: ['products'] });
                                            setSelectedMedia(prev => [...prev, media]);
                                        } else {
                                            setSelectedMedia(prev => [...prev, media]);
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                                    className="px-4 py-2 btn-theme-primary rounded-md disabled:opacity-50"
                                >
                                    {createProductMutation.isPending || updateProductMutation.isPending ? t('common.saving') : (editingProduct ? t('products.edit_product') : t('products.add_new_product'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Stock Movement Sheet */}
            <StockMovementSheet
                isOpen={isStockMovementOpen}
                onClose={handleCloseStockMovement}
                preselectedProductId={selectedProductForStock?.id}
                preselectedProductName={selectedProductForStock?.name}
            />
        </div >
    );
}
