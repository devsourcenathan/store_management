import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from "@/components/ui/Pagination";
import { ExportButton } from '@/components/ExportButton';

interface Supplier {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}

export function SuppliersPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: suppliers, isLoading } = useQuery<Supplier[]>({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const response = await api.get('/suppliers');
            return response.data;
        },
    });

    const {
        currentItems,
        currentPage,
        totalPages,
        goToPage: setPage,
    } = usePagination({
        totalItems: suppliers?.length || 0,
        itemsPerPage: 10,
    });

    const paginatedSuppliers = suppliers ? currentItems(suppliers) : [];

    const createSupplierMutation = useMutation({
        mutationFn: async (newSupplier: any) => {
            return api.post('/suppliers', newSupplier);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
        },
    });

    const updateSupplierMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.patch(`/suppliers/${data.id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
            setEditingId(null);
        },
    });

    const deleteSupplierMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/suppliers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateSupplierMutation.mutate({ ...formData, id: editingId });
        } else {
            createSupplierMutation.mutate(formData);
        }
    };

    const handleEdit = (supplier: Supplier) => {
        setFormData({
            name: supplier.name,
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || ''
        });
        setEditingId(supplier.id);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            deleteSupplierMutation.mutate(id);
        }
    };

    const openNewModal = () => {
        setFormData({ name: '', email: '', phone: '', address: '' });
        setEditingId(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('suppliers.management_title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('suppliers.management_subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <ExportButton
                        data={suppliers || []}
                        columns={[
                            { header: t('common.name'), key: 'name' },
                            { header: t('common.email'), key: 'email' },
                            { header: t('common.phone'), key: 'phone' },
                            { header: t('common.address'), key: 'address' },
                        ]}
                        title={t('suppliers.management_title')}
                        format="pdf"
                        variant="outline"
                        size="sm"
                    />
                    <ExportButton
                        data={suppliers || []}
                        columns={[
                            { header: t('common.name'), key: 'name' },
                            { header: t('common.email'), key: 'email' },
                            { header: t('common.phone'), key: 'phone' },
                            { header: t('common.address'), key: 'address' },
                        ]}
                        title={t('suppliers.management_title')}
                        format="excel"
                        variant="outline"
                        size="sm"
                    />
                    <button
                        onClick={openNewModal}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 btn-theme-primary rounded-lg transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('common.create', 'Create')} {t('suppliers.supplier')}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full text-center py-12 dark:text-gray-400">{t('common.loading')}</div>
                ) : paginatedSuppliers.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow">{t('suppliers.no_orders', 'No suppliers found.')}</div>
                ) : (
                    paginatedSuppliers.map((supplier) => (
                        <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4 border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{supplier.name}</h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(supplier)}
                                        className="text-gray-400 hover:text-blue-600"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(supplier.id)}
                                        className="text-gray-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                {supplier.email && (
                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center space-x-2">
                                        <Phone className="w-4 h-4" />
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center space-x-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{supplier.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>



            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
            />

            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{editingId ? t('common.edit') + ' ' + t('suppliers.supplier') : t('common.create') + ' ' + t('suppliers.supplier')}</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</label>
                                    <input type="text" required className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.email')}</label>
                                    <input type="email" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                        value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</label>
                                    <input type="text" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                        value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.address')}</label>
                                    <textarea className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                        value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</button>
                                    <button type="submit" disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending} className="px-4 py-2 btn-theme-primary rounded-md">
                                        {createSupplierMutation.isPending || updateSupplierMutation.isPending ? t('common.processing') : t('common.save')}
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
