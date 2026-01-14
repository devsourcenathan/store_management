import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Pencil, Trash2, MapPin, Phone } from 'lucide-react';
import { StoreFormSheet } from './StoreFormSheet';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function StoreList() {
    const { t } = useTranslation();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<any>(null);

    const queryClient = useQueryClient();

    const { data: stores, isLoading } = useQuery({
        queryKey: ['stores'],
        queryFn: async () => {
            const res = await api.get('/stores');
            return res.data;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/stores/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success(t('settings.stores.messages.delete_success'));
        }
    });

    if (isLoading) return <div>{t('common.loading')}...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">{t('settings.stores.title')}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('settings.stores.subtitle')}</p>
                </div>
                <button
                    onClick={() => { setEditingStore(null); setIsSheetOpen(true); }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
                                    onClick={() => { setEditingStore(store); setIsSheetOpen(true); }}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/40 rounded transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm(t('settings.stores.delete_confirm'))) {
                                            deleteMutation.mutate(store.id);
                                        }
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/40 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <StoreFormSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                store={editingStore}
            />
        </div>
    );
}
