import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Save, Store as StoreIcon } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

interface NewStoreModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function NewStoreModal({ onClose, onSuccess }: NewStoreModalProps) {
    const { t } = useTranslation();
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const queryClient = useQueryClient();

    const createStoreMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/stores', data);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            await refreshUser();
            onSuccess();
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createStoreMutation.mutate({
            name,
            address,
            organizationId: user?.organizationId
        });
    };

    return (
        <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center text-gray-900 dark:text-gray-100">
                        <StoreIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                        {t('stores.add_store')}
                    </SheetTitle>
                    <SheetDescription className="dark:text-gray-400">
                        {t('stores.new_store_desc', 'Register a new physical store location for your organization.')}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300">{t('stores.store_name')}</label>
                        <input
                            type="text"
                            required
                            className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Boutique Douala"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300">{t('stores.location')}</label>
                        <textarea
                            rows={3}
                            className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="e.g., Akwa, face à la banque..."
                        />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={createStoreMutation.isPending}
                            className="flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm transition-all"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {createStoreMutation.isPending ? t('common.processing') : t('stores.add_store')}
                        </button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
