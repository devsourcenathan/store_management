import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MiscTransactionFormProps {
    stores: any[];
    onCancel: () => void;
}

export function MiscTransactionForm({ stores, onCancel }: MiscTransactionFormProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { register, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            storeId: '',
            type: 'OUT',
            amount: '',
            description: '',
            date: '' 
        }
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const payload = {
                storeId: values.storeId,
                type: values.type,
                amount: Number(values.amount),
                description: values.description,
                date: values.date ? new Date(values.date).toISOString() : undefined,
            };
            const res = await api.post('/misc-transactions', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success(t('misc_transactions.messages.success'));
            reset({ type: 'OUT' });
            onCancel();
            queryClient.invalidateQueries({ queryKey: ['misc-transactions'] });
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message || t('misc_transactions.messages.error'),
            );
        },
    });

    const onSubmit = (data: any) => {
        createMutation.mutate(data);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('misc_transactions.form.title')}</CardTitle>
                <CardDescription>
                    {t('misc_transactions.form.desc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('misc_transactions.form.store')} <span className="text-destructive">*</span></label>
                            <Select 
                                onValueChange={(val) => setValue('storeId', val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('misc_transactions.form.select_store')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('misc_transactions.form.type')} <span className="text-destructive">*</span></label>
                            <Select 
                                defaultValue="OUT"
                                onValueChange={(val) => setValue('type', val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('misc_transactions.form.select_type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IN">
                                        <div className="flex items-center">
                                            <ArrowUpCircle className="w-4 h-4 mr-2 text-emerald-500" />
                                            {t('misc_transactions.form.type_in')}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="OUT">
                                        <div className="flex items-center">
                                            <ArrowDownCircle className="w-4 h-4 mr-2 text-rose-500" />
                                            {t('misc_transactions.form.type_out')}
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('misc_transactions.form.date')}</label>
                            <Input 
                                type="datetime-local" 
                                {...register('date')}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('misc_transactions.form.amount')} <span className="text-destructive">*</span></label>
                            <Input 
                                type="number" 
                                min="1"
                                placeholder={t('misc_transactions.form.amount_placeholder')}
                                {...register('amount', { required: true, min: 1 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('misc_transactions.form.description')} <span className="text-destructive">*</span></label>
                            <Input 
                                placeholder={t('misc_transactions.form.description_placeholder')}
                                {...register('description', { required: true, minLength: 3 })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            {t('misc_transactions.cancel')}
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? t('misc_transactions.form.saving') : t('misc_transactions.form.save')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
