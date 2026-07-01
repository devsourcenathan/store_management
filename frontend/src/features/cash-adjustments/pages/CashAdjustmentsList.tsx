import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { useStore } from '@/features/stores/StoreProvider';
import { CashAdjustment, CreateCashAdjustmentDto } from '../types';
import { CashAdjustmentForm } from '../components/CashAdjustmentForm';
import { Button } from '@/components/ui/button';
import { useThemedButtonStyle, getThemedButtonClasses } from '@/hooks/useThemedButton';
import { Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function CashAdjustmentsList() {
    const { t } = useTranslation();
    const { currentStore } = useStore();
    const queryClient = useQueryClient();
    const themedButtonStyle = useThemedButtonStyle('primary');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleOpenForm = () => {
        setIsFormOpen(true);
        if (currentStore?.id) {
            queryClient.invalidateQueries({ queryKey: ['cash-adjustments-expected', currentStore.id] });
        }
    };

    const { data: adjustments, isLoading } = useQuery<CashAdjustment[]>({
        queryKey: ['cash-adjustments', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];
            const response = await api.get(`/stores/${currentStore.id}/cash-adjustments`);
            return response.data;
        },
        enabled: !!currentStore?.id,
    });

    const { data: expectedData, isLoading: isLoadingExpected } = useQuery({
        queryKey: ['cash-adjustments-expected', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return { expected: 0 };
            const response = await api.get(`/stores/${currentStore.id}/cash-adjustments/expected`);
            return response.data;
        },
        enabled: !!currentStore?.id && isFormOpen,
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateCashAdjustmentDto) => {
            return api.post(`/stores/${currentStore?.id}/cash-adjustments`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-adjustments', currentStore?.id] });
            setIsFormOpen(false);
            toast.success(t('cash_adjustments.success'));
        },
        onError: () => {
            toast.error(t('cash_adjustments.error'));
        }
    });

    const handleCreate = (data: CreateCashAdjustmentDto) => {
        createMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('cash_adjustments.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('cash_adjustments.description')}
                    </p>
                </div>
                <button 
                    onClick={handleOpenForm}
                    className={getThemedButtonClasses('primary', 'md')}
                    style={themedButtonStyle}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {t('cash_adjustments.new_count')}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('cash_adjustments.date')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('cash_adjustments.user')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('cash_adjustments.expected')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('cash_adjustments.counted')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('cash_adjustments.difference')}</th>
                                <th className="px-6 py-3 font-medium text-gray-500 uppercase tracking-wider">{t('cash_adjustments.reason')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('common.loading')}</td>
                                </tr>
                            ) : adjustments?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('cash_adjustments.no_data')}</td>
                                </tr>
                            ) : (
                                adjustments?.map((adj) => (
                                    <tr key={adj.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {format(new Date(adj.createdAt), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {adj.creator?.firstName} {adj.creator?.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{Number(adj.expected).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{Number(adj.counted).toFixed(2)}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap font-bold ${Number(adj.difference) > 0 ? 'text-green-600' : Number(adj.difference) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                            {Number(adj.difference) > 0 ? '+' : ''}{Number(adj.difference).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-600 truncate block max-w-xs" title={adj.reason}>
                                                {adj.reason || '-'}
                                            </span>
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
                        <SheetTitle>{t('cash_adjustments.form_title')}</SheetTitle>
                        <SheetDescription>
                            {t('cash_adjustments.form_desc')}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                        {isLoadingExpected ? (
                            <div className="py-8 text-center text-gray-500">
                                {t('common.loading')}
                            </div>
                        ) : (
                            <CashAdjustmentForm
                                initialExpected={expectedData?.expected || 0} 
                                onSubmit={handleCreate}
                                isLoading={createMutation.isPending}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
