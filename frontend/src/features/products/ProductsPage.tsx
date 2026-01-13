import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Package, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';

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
            if (!confirm('Are you sure you want to delete this product?')) throw new Error('Cancelled');
            return api.delete(`/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error) => {
            if (error.message !== 'Cancelled') {
                alert('Failed to delete product');
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

    if (isLoading) return <div className="p-8 text-center">Loading products...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Products</h2>
                    <p className="text-gray-600">Manage your product catalog</p>
                </div>
                <div className="flex space-x-3">
                    {stores && (
                        <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                        >
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Add Product
                    </button>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No products found. Click "Add Product" to create your first product.
                                </td>
                            </tr>
                        ) : (
                            products?.map((product: any) => (
                                <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                                <ImageIcon className="w-6 h-6" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                <div className="text-sm text-gray-500">{product.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center space-x-1 outline-none">
                                            <Package className={`w-4 h-4 ${product.quantity <= 10 ? 'text-red-500' : 'text-green-500'}`} />
                                            <span className={product.quantity <= 10 ? 'text-red-600 font-bold' : ''}>
                                                {product.quantity ?? 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.basePrice} FCFA</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="text-red-600 hover:text-red-900"
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

            {/* Add/Edit Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">SKU</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Base Price</label>
                                <input
                                    type="number"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.basePrice}
                                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Minimum Stock Alert</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                >
                                    <option value="">Select a category</option>
                                    {categories?.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {createProductMutation.isPending || updateProductMutation.isPending ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
