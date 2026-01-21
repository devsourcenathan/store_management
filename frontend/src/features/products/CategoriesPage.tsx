import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from "@/components/ui/Pagination";

interface Category {
    id: string;
    name: string;
    description?: string;
    _count?: {
        products: number;
    };
}

export function CategoriesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: categories, isLoading } = useQuery<Category[]>({
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
        totalItems: categories?.length || 0,
        itemsPerPage: 10,
    });

    const paginatedCategories = categories ? currentItems(categories) : [];

    const createCategoryMutation = useMutation({
        mutationFn: async (newCategory: any) => {
            return api.post('/categories', newCategory);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsModalOpen(false);
            setFormData({ name: '', description: '' });
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            return api.patch(`/categories/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsModalOpen(false);
            setFormData({ name: '', description: '' });
            setEditingCategory(null);
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!confirm(t('common.confirm_delete', 'Are you sure you want to delete this category?'))) {
                throw new Error('Cancelled');
            }
            return api.delete(`/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error: any) => {
            if (error.message !== 'Cancelled') {
                alert(t('common.error', 'An error occurred'));
            }
        }
    });

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        deleteCategoryMutation.mutate(id);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            updateCategoryMutation.mutate({ id: editingCategory.id, data: formData });
        } else {
            createCategoryMutation.mutate(formData);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', description: '' });
        setEditingCategory(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('products.categories_title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('products.categories_subtitle')}</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 btn-theme-primary rounded-lg transition-colors whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    <span>{t('products.add_category')}</span>
                </button>
            </div>

            {/* Categories Display - Cards on Mobile, Table on Desktop */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {isLoading ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                    ) : paginatedCategories.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">{t('products.no_categories')}</div>
                    ) : (
                        paginatedCategories.map((category) => (
                            <div key={category.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{category.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{category.description || '-'}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-2">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-2 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Products</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{category._count?.products || 0}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.category_name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.description')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('products.title')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-center dark:text-gray-400">{t('common.loading')}</td></tr>
                            ) : paginatedCategories.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{t('products.no_categories')}</td></tr>
                            ) : (
                                paginatedCategories.map((category) => (
                                    <tr key={category.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{category.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{category.description || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{category._count?.products || 0}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(category)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                            {editingCategory ? t('common.edit') + ' ' + t('products.category_name') : t('products.add_category')}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.category_name')}</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.description')}</label>
                                <textarea
                                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); resetForm(); }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                                    className="px-4 py-2 btn-theme-primary rounded-md disabled:opacity-50"
                                >
                                    {createCategoryMutation.isPending || updateCategoryMutation.isPending
                                        ? t('common.processing')
                                        : (editingCategory ? t('common.save') : t('products.add_category'))
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
