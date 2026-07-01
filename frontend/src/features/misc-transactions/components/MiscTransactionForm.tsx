import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useThemedButtonStyle, getThemedButtonClasses } from '@/hooks/useThemedButton';
import { CreateMiscTransactionDto } from '../types';

interface MiscTransactionFormProps {
    onSubmit: (data: CreateMiscTransactionDto) => void;
    isLoading?: boolean;
}

export function MiscTransactionForm({ onSubmit, isLoading }: MiscTransactionFormProps) {
    const { t } = useTranslation();
    const themedButtonStyle = useThemedButtonStyle('primary');
    
    const schema = z.object({
        type: z.enum(['IN', 'OUT'], { required_error: t('common.error') }),
        amount: z.number({ required_error: t('common.error') }).min(0.01, t('common.error')),
        description: z.string().min(1, t('common.error')),
        date: z.string().optional(),
    });

    const { control, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            type: 'OUT' as 'IN' | 'OUT',
            amount: 0,
            description: '',
            date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
        },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="type">{t('misc_transactions.type_label')}</Label>
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <select
                            {...field}
                            id="type"
                            className="w-full px-3 py-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="OUT">{t('misc_transactions.type_out')}</option>
                            <option value="IN">{t('misc_transactions.type_in')}</option>
                        </select>
                    )}
                />
                {errors.type && <p className="text-red-500 text-sm">{errors.type.message?.toString()}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="amount">{t('misc_transactions.amount')}</Label>
                <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="number"
                            step="0.01"
                            id="amount"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                    )}
                />
                {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message?.toString()}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="date">{t('misc_transactions.date_label')}</Label>
                <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type="datetime-local"
                            id="date"
                        />
                    )}
                />
                {errors.date && <p className="text-red-500 text-sm">{errors.date.message?.toString()}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">{t('misc_transactions.desc')} <span className="text-red-500">*</span></Label>
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <textarea
                            {...field}
                            id="description"
                            className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder={t('misc_transactions.desc_placeholder')}
                        />
                    )}
                />
                {errors.description && <p className="text-red-500 text-sm">{errors.description.message?.toString()}</p>}
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className={getThemedButtonClasses('primary', 'md')}
                    style={themedButtonStyle}
                >
                    {isLoading ? t('misc_transactions.saving') : t('misc_transactions.save')}
                </button>
            </div>
        </form>
    );
}
