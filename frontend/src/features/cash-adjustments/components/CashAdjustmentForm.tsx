import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CashAdjustmentFormProps {
    stores: any[];
    onCancel: () => void;
}

export function CashAdjustmentForm({ stores, onCancel }: CashAdjustmentFormProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { register, handleSubmit, watch, reset, setValue } = useForm({
        defaultValues: {
            storeId: '',
            expected: '',
            counted: '',
            reason: '',
            date: '' 
        }
    });

    const expectedValue = watch('expected');
    const countedValue = watch('counted');
    const difference = expectedValue && countedValue 
        ? Number(countedValue) - Number(expectedValue)
        : undefined;

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const payload = {
                storeId: values.storeId,
                expected: Number(values.expected),
                counted: Number(values.counted),
                reason: values.reason,
                date: values.date ? new Date(values.date).toISOString() : undefined,
            };
            const res = await api.post('/cash-adjustments', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success(t('cash_adjustments.messages.success'));
            reset();
            onCancel();
            queryClient.invalidateQueries({ queryKey: ['cash-adjustments'] });
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message || t('cash_adjustments.messages.error'),
            );
        },
    });

    const onSubmit = (data: any) => {
        createMutation.mutate(data);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('cash_adjustments.form.title')}</CardTitle>
                <CardDescription>
                    {t('cash_adjustments.form.desc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('cash_adjustments.form.store')} <span className="text-destructive">*</span></label>
                            <Select 
                                onValueChange={(val) => setValue('storeId', val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('cash_adjustments.form.select_store')} />
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
                            <label className="text-sm font-medium">{t('cash_adjustments.form.date')}</label>
                            <Input 
                                type="datetime-local" 
                                {...register('date')}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('cash_adjustments.form.expected')} <span className="text-destructive">*</span></label>
                            <Input 
                                type="number" 
                                min="0"
                                placeholder={t('cash_adjustments.form.expected_placeholder')}
                                {...register('expected', { required: true, min: 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('cash_adjustments.form.counted')} <span className="text-destructive">*</span></label>
                            <Input 
                                type="number" 
                                min="0"
                                placeholder={t('cash_adjustments.form.counted_placeholder')}
                                {...register('counted', { required: true, min: 0 })}
                            />
                        </div>
                    </div>

                    {/* Live difference display */}
                    {difference !== undefined && !isNaN(difference) && (
                        <div className={`p-4 rounded-md border text-sm font-medium ${
                            difference > 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' :
                            difference < 0 ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800' :
                            'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                        }`}>
                            {t('cash_adjustments.form.diff_calculated')} {' '}
                            <strong>
                                {difference > 0 ? '+' : ''}{difference.toLocaleString()} F
                            </strong>
                            {' '}
                            {difference > 0 ? `(${t('cash_adjustments.form.surplus')})` : difference < 0 ? `(${t('cash_adjustments.form.deficit')})` : `(${t('cash_adjustments.form.balanced')})`}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('cash_adjustments.form.reason')}</label>
                        <Textarea 
                            rows={3} 
                            placeholder={t('cash_adjustments.form.reason_placeholder')}
                            {...register('reason')}
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            {t('cash_adjustments.cancel')}
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? t('cash_adjustments.form.saving') : t('cash_adjustments.form.save')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
