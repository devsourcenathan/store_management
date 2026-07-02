import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateCashAdjustmentDto } from '../types';

export function CashAdjustmentForm({ initialExpected = 0, onSubmit, isLoading }: { initialExpected?: number; onSubmit: (data: CreateCashAdjustmentDto) => void; isLoading?: boolean; }) {
    const { t } = useTranslation();
    
    const cashAdjustmentSchema = z.object({
        expected: z.number().min(0),
        counted: z.number().min(0),
        reason: z.string().optional(),
    }).superRefine((data, ctx) => {
        const diff = data.counted - data.expected;
        if (diff !== 0 && (!data.reason || data.reason.trim() === '')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t('common.error'), // Simplified for schema since translation hooks are hard inside outside functions. I moved schema inside to use t().
                path: ['reason'],
            });
        }
    });

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        resolver: zodResolver(cashAdjustmentSchema),
        defaultValues: {
            expected: initialExpected,
            counted: 0,
            reason: '',
        },
    });

    useEffect(() => {
        setValue('expected', initialExpected);
    }, [initialExpected, setValue]);

    const expected = watch('expected') || 0;
    const counted = watch('counted') || 0;
    const difference = counted - expected;

    const onFormSubmit = (data: any) => {
        onSubmit({
            ...data,
            difference,
        });
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="expected">{t('cash_adjustments.expected_amount')}</Label>
                <Controller
                    name="expected"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="number"
                            id="expected"
                            disabled
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="counted">{t('cash_adjustments.counted_amount')}</Label>
                <Controller
                    name="counted"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="number"
                            id="counted"
                            autoFocus
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                    )}
                />
            </div>

            <div className="p-4 bg-gray-50 rounded-md">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">{t('cash_adjustments.difference')} :</span>
                    <span className={`font-bold text-lg ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                    </span>
                </div>
            </div>

            {difference !== 0 && (
                <div className="space-y-2">
                    <Label htmlFor="reason">{t('cash_adjustments.reason_label')} <span className="text-red-500">*</span></Label>
                    <Controller
                        name="reason"
                        control={control}
                        render={({ field }) => (
                            <textarea
                                {...field}
                                id="reason"
                                className="w-full min-h-[80px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t('cash_adjustments.reason_placeholder')}
                            />
                        )}
                    />
                    {errors.reason && <p className="text-red-500 text-sm">{errors.reason.message?.toString()}</p>}
                </div>
            )}

            <div className="pt-4 flex justify-end">
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="px-4 py-2 btn-theme-primary rounded-md disabled:opacity-50 transition-colors shadow-sm"
                >
                    {isLoading ? t('cash_adjustments.saving') : t('cash_adjustments.save')}
                </button>
            </div>
        </form>
    );
}
