import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2, MapPin, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function StoreList() {
    const { t } = useTranslation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<any>(null);

    const queryClient = useQueryClient();

    const { data: stores, isLoading } = useQuery({
        queryKey: ['stores'],
        queryFn: async () => {
            const res = await api.get('/stores');
            return res.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/stores', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            setIsDialogOpen(false);
            setEditingStore(null);
            toast.success(t('settings.stores.messages.create_success'));
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.put(`/stores/${editingStore.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            setIsDialogOpen(false);
            setEditingStore(null);
            toast.success(t('settings.stores.messages.update_success'));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/stores/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success(t('settings.stores.messages.delete_success'));
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        if (editingStore) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    if (isLoading) return <div>{t('common.loading')}...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('settings.stores.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.stores.subtitle')}</p>
                </div>
                <button
                    onClick={() => { setEditingStore(null); setIsDialogOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    {t('settings.stores.add_store')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores?.map((store: any) => (
                    <div key={store.id} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{store.name}</h4>
                                {store.address && (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {store.address}
                                    </div>
                                )}
                                {store.phone && (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mt-1">
                                        <Phone className="w-3 h-3" />
                                        {store.phone}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setEditingStore(store); setIsDialogOpen(true); }}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/40 rounded"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(t('settings.stores.delete_confirm'))) {
                                            deleteMutation.mutate(store.id);
                                        }
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/40 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
                    <DialogHeader>
                        <DialogTitle>{editingStore ? t('settings.stores.edit_store') : t('settings.stores.new_store')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('settings.stores.form.name')}</label>
                            <input
                                name="name"
                                defaultValue={editingStore?.name}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('settings.stores.form.address')}</label>
                            <input
                                name="address"
                                defaultValue={editingStore?.address}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('settings.stores.form.phone')}</label>
                            <input
                                name="phone"
                                defaultValue={editingStore?.phone}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('settings.stores.form.email')}</label>
                            <input
                                name="email"
                                type="email"
                                defaultValue={editingStore?.email}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('settings.stores.form.receipt_footer')}</label>
                            <textarea
                                name="receiptFooter"
                                defaultValue={editingStore?.receiptFooter}
                                rows={2}
                                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Thank you for your visit!"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsDialogOpen(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {editingStore ? t('settings.stores.form.save') : t('settings.stores.form.create')}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
