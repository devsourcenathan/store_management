import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StoreFormSheetProps {
    isOpen: boolean;
    onClose: () => void;
    store?: any; // If provided, we are in edit mode
}

export function StoreFormSheet({ isOpen, onClose, store }: StoreFormSheetProps) {
    const { t } = useTranslation();
    const { refreshUser } = useAuth();
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            name: '',
            address: '',
            phone: '',
            email: '',
            receiptFooter: ''
        }
    });

    useEffect(() => {
        if (store) {
            reset({
                name: store.name,
                address: store.address || '',
                phone: store.phone || '',
                email: store.email || '',
                receiptFooter: store.receiptFooter || ''
            });
        } else {
            reset({
                name: '',
                address: '',
                phone: '',
                email: '',
                receiptFooter: ''
            });
        }
    }, [store, reset, isOpen]);

    const createMutation = useMutation({
        mutationFn: async (data: any) => api.post('/stores', data),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            await refreshUser();
            toast.success(t('settings.stores.messages.create_success'));
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create store');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => api.put(`/stores/${store.id}`, data),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            await refreshUser();
            toast.success(t('settings.stores.messages.update_success'));
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update store');
        }
    });

    const onSubmit = (data: any) => {
        if (store) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[500px] w-full dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
                <SheetHeader>
                    <SheetTitle>{store ? t('settings.stores.edit_store') : t('settings.stores.new_store')}</SheetTitle>
                    <SheetDescription>
                        {store ? t('settings.stores.form.edit_desc', 'Update your store details.') : t('settings.stores.form.create_desc', 'Enter the details for your new store.')}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-gray-300">{t('settings.stores.form.name')}</label>
                        <Input
                            {...register('name', { required: true })}
                            placeholder="e.g. Main Street Branch"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-gray-300">{t('settings.stores.form.address')}</label>
                        <Input
                            {...register('address')}
                            placeholder="123 Commerce St"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-gray-300">{t('settings.stores.form.phone')}</label>
                        <Input
                            {...register('phone')}
                            placeholder="+1 234 567 8900"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-gray-300">{t('settings.stores.form.email')}</label>
                        <Input
                            {...register('email')}
                            type="email"
                            placeholder="store@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-gray-300">{t('settings.stores.form.receipt_footer')}</label>
                        <textarea
                            {...register('receiptFooter')}
                            rows={3}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder={t('settings.stores.form.receipt_footer_placeholder', 'Thank you for your visit!')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? t('common.processing') : (store ? t('settings.stores.form.save') : t('settings.stores.form.create'))}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
