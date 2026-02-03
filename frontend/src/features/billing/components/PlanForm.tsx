import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlatformPlan } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface PlanFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: PlatformPlan | null;
}

export function PlanForm({ open, onOpenChange, onSubmit, initialData }: PlanFormProps) {
    const { t } = useTranslation();
    const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    name: initialData.name,
                    type: initialData.type,
                    monthlyPrice: initialData.monthlyPrice,
                    semiAnnualPrice: initialData.semiAnnualPrice,
                    annualPrice: initialData.annualPrice,
                    maxStores: initialData.maxStores,
                    maxProducts: initialData.maxProducts,
                    maxUsers: initialData.maxUsers,
                    trialDays: initialData.trialDays,
                });
            } else {
                reset({
                    name: '',
                    type: 'PRO',
                    monthlyPrice: 0,
                    semiAnnualPrice: 0,
                    annualPrice: 0,
                    maxStores: null,
                    maxProducts: null,
                    maxUsers: null,
                    trialDays: 0,
                });
            }
        }
    }, [open, initialData, reset]);

    const handleFormSubmit = async (data: any) => {
        // Convert empty strings to null for limits
        const formattedData = {
            ...data,
            monthlyPrice: Number(data.monthlyPrice),
            semiAnnualPrice: Number(data.semiAnnualPrice),
            annualPrice: Number(data.annualPrice),
            trialDays: Number(data.trialDays),
            maxStores: data.maxStores === '' ? null : Number(data.maxStores),
            maxProducts: data.maxProducts === '' ? null : Number(data.maxProducts),
            maxUsers: data.maxUsers === '' ? null : Number(data.maxUsers),
        };
        await onSubmit(formattedData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? t('billing.editPlan', 'Edit Plan') : t('billing.createPlan', 'Create Plan')}</DialogTitle>
                    <DialogDescription>
                        {t('billing.planFormDesc', 'Configure plan details, pricing, and limits.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('billing.name', 'Plan Name')}</Label>
                            <Input {...register('name', { required: true })} placeholder="e.g. Professional" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('billing.type', 'Type')}</Label>
                            <Select onValueChange={(v) => setValue('type', v)} defaultValue={initialData?.type || 'PRO'}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FREE">Free</SelectItem>
                                    <SelectItem value="PRO">Pro</SelectItem>
                                    <SelectItem value="BUSINESS">Business</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>{t('billing.monthlyPrice', 'Monthly Price (XAF)')}</Label>
                            <Input type="number" {...register('monthlyPrice', { required: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('billing.semiAnnualPrice', 'Semi-Annual Price')}</Label>
                            <Input type="number" {...register('semiAnnualPrice', { required: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('billing.annualPrice', 'Annual Price')}</Label>
                            <Input type="number" {...register('annualPrice', { required: true })} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('billing.trialDays', 'Trial Days')}</Label>
                        <Input type="number" {...register('trialDays')} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>{t('billing.maxStores', 'Max Stores (Empty = Unlimited)')}</Label>
                            <Input type="number" {...register('maxStores')} placeholder="Unlimited" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('billing.maxProducts', 'Max Products')}</Label>
                            <Input type="number" {...register('maxProducts')} placeholder="Unlimited" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('billing.maxUsers', 'Max Users')}</Label>
                            <Input type="number" {...register('maxUsers')} placeholder="Unlimited" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel', 'Cancel')}</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save', 'Save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
