import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { useStore } from '@/features/stores/StoreProvider';
import { MiscTransaction, CreateMiscTransactionDto } from '../types';
import { MiscTransactionForm } from '../components/MiscTransactionForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function MiscTransactionsList() {
    const { t } = useTranslation();
    const { currentStore } = useStore();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);

    const { data: transactions, isLoading } = useQuery<MiscTransaction[]>({
        queryKey: ['misc-transactions', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            const response = await api.get(`/stores/${currentStore.id}/misc-transactions`);
            return response.data;
        },
        enabled: !!currentStore?.id,
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateMiscTransactionDto) => {
            return api.post(`/stores/${currentStore?.id}/misc-transactions`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['misc-transactions', currentStore?.id] });
            setIsFormOpen(false);
            toast.success(t('misc_transactions.success'));
        },
        onError: () => {
            toast.error(t('misc_transactions.error'));
        }
    });

    const handleCreate = (data: CreateMiscTransactionDto) => {
        createMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('misc_transactions.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('misc_transactions.description')}
                    </p>
                </div>
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 btn-theme-primary rounded-lg transition-colors flex items-center justify-center whitespace-nowrap shadow-sm hover:shadow"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('misc_transactions.new_transaction')}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('misc_transactions.date')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('misc_transactions.type')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('misc_transactions.amount')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('misc_transactions.desc')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('misc_transactions.created_by')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('common.loading')}</td>
                                </tr>
                            ) : transactions?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('misc_transactions.no_data')}</td>
                                </tr>
                            ) : (
                                transactions?.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {format(new Date(tx.date), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                tx.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {tx.type === 'IN' ? t('misc_transactions.in') : t('misc_transactions.out')}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap font-bold ${
                                            tx.type === 'IN' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {tx.type === 'IN' ? '+' : '-'}{Number(tx.amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-900 block max-w-sm truncate" title={tx.description}>
                                                {tx.description}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {tx.creator?.firstName} {tx.creator?.lastName}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{t('misc_transactions.form_title')}</SheetTitle>
                        <SheetDescription>
                            {t('misc_transactions.form_desc')}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                        <MiscTransactionForm
                            onSubmit={handleCreate}
                            isLoading={createMutation.isPending}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
