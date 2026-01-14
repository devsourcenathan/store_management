import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Package, Image as ImageIcon, Edit, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Product {
    id: string;
    name: string;
    sku: string;
    description?: string;
    basePrice: number;
    minStock: number;
    isActive: boolean;
    categoryId?: string;
    category?: {
        id: string;
        name: string;
    };
    stockLevels?: Array<{
        storeId: string;
        quantity: number;
    }>;
    time: number; // For forcing re-render if needed
}

export function ProductsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({ name: '', sku: '', basePrice: 0, minStock: 10, categoryId: '' });
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const queryClient = useQueryClient();

    const { t } = useTranslation();

    const { data: stores } = useQuery<any[]>({
        queryKey: ['stores'],
        queryFn: async () => {
            const response = await api.get('/organizations/current');
            const storeList = response.data.stores || [];
            if (storeList.length > 0 && !selectedStoreId) setSelectedStoreId(storeList[0].id);
            return storeList;
        },
    });

    const { data: products, isLoading } = useQuery<any[]>({
        queryKey: ['products', selectedStoreId],
        queryFn: async () => {
            const response = await api.get('/products');
            const prods = response.data;

            // Fetch stock for each product if a store is selected
            if (selectedStoreId) {
                const stockResponse = await api.get(`/stock/movements?storeId=${selectedStoreId}`);
                const movements = stockResponse.data;

                return prods.map((p: any) => {
                    const productMovements = movements.filter((m: any) => m.productId === p.id);
                    const quantity = productMovements.reduce((acc: number, m: any) =>
                        acc + (m.type === 'IN' || m.type === 'RETURN' || m.type === 'ADJUST' ? m.quantity : -m.quantity), 0);

                    return { ...p, quantity };
                });
            }
            return prods;
        },
    });

    const { data: categories } = useQuery<any[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await api.get('/categories');
            return response.data;
        },
    });

    const createProductMutation = useMutation({
        mutationFn: async (newProduct: any) => {
            return api.post('/products', newProduct);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const updateProductMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            return api.patch(`/products/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsModalOpen(false);
            resetForm();
        },
    });

    const deleteProductMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!confirm(t('products.delete_confirm'))) throw new Error('Cancelled');
            return api.delete(`/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            if (error.message !== 'Cancelled') {
                alert(t('products.delete_error'));
            }
        }
    });

    const resetForm = () => {
        setFormData({ name: '', sku: '', basePrice: 0, minStock: 10, categoryId: '' });
        setEditingProduct(null);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            basePrice: Number(product.basePrice),
            minStock: product.minStock || 10,
            categoryId: product.categoryId || product.category?.id || '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        deleteProductMutation.mutate(id);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            updateProductMutation.mutate({ id: editingProduct.id, data: formData });
        } else {
            createProductMutation.mutate(formData);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('products.loading')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('products.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('products.subtitle')}</p>
                </div>
                <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                    {stores && (
                        <select
                            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full xs:w-auto"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                        >
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}

                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base touch-target w-full xs:w-auto flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4 sm:inline-block mr-0 sm:mr-2" />
                        <span className="hidden xs:inline">{t('products.add_product')}</span>
                        <span className="xs:hidden">{t('common.add')}</span>
                    </button>
                </div>
            </div>

            {/* Products Display - Cards on Mobile, Table on Desktop */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {products?.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                            {t('products.no_products')}
                        </div>
                    ) : (
                        products?.map((product: any) => (
                            <div key={product.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                                {/* Product Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center flex-1 min-w-0">
                                        <div className="flex-shrink-0 h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                        <div className="ml-3 flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {product.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                SKU: {product.sku}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center space-x-2 ml-2">
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
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
                            {products?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        {t('products.no_products')}
                                    </td>
                                </tr>
                            ) : (
                                products?.map((product: any) => (
                                    <tr key={product.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                    <ImageIcon className="w-6 h-6" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{product.sku}</div>
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

            {/* Add/Edit Product Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50 transition-opacity">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-[95vw] max-w-md sm:max-w-lg transition-colors border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{editingProduct ? t('products.edit_product') : t('products.add_product')}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.sku')}</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.base_price')}</label>
                                    <input
                                        type="number"
                                        required
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.basePrice}
                                        onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
                                    />
                                </div>
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.fields.category')}</label>
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
                                <div className="flex justify-end space-x-3 mt-6">
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
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {createProductMutation.isPending || updateProductMutation.isPending ? t('common.saving') : (editingProduct ? t('products.edit_product') : t('products.add_new_product'))}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
