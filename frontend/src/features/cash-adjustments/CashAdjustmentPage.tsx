import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { api } from '@/services/api';
import { useAuth } from '@/features/auth/useAuth';
import { 
    Plus, 
    TrendingUp, 
    TrendingDown, 
    Minus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { CashAdjustmentForm } from './components/CashAdjustmentForm';
import { CashAdjustmentTable, CashAdjustment } from './components/CashAdjustmentTable';

export function CashAdjustmentPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    
    const [showForm, setShowForm] = useState(false);
    const [storeFilter, setStoreFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');
    
    // Fetch stores
    const { data: stores = [] } = useQuery({
        queryKey: ['stores', user?.organizationId],
        queryFn: async () => {
            const res = await api.get(`/stores?organizationId=${user?.organizationId}`);
            return res.data;
        },
        enabled: !!user?.organizationId,
    });

    // Fetch cash adjustments
    const { data: adjustments = [], isLoading } = useQuery({
        queryKey: ['cash-adjustments', user?.organizationId, storeFilter, dateFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (storeFilter && storeFilter !== 'all') params.set('storeId', storeFilter);
            if (dateFilter) {
               const start = dayjs(dateFilter).startOf('day').toISOString();
               const end = dayjs(dateFilter).endOf('day').toISOString();
               params.set('startDate', start);
               params.set('endDate', end);
            }
            
            const res = await api.get(`/cash-adjustments?${params.toString()}`);
            return res.data as CashAdjustment[];
        },
        enabled: !!user?.organizationId,
    });

    // Totals
    const totalSurplus = adjustments
        .filter((a: CashAdjustment) => parseFloat(a.difference) > 0)
        .reduce((sum: number, a: CashAdjustment) => sum + parseFloat(a.difference), 0);
    const totalDeficit = adjustments
        .filter((a: CashAdjustment) => parseFloat(a.difference) < 0)
        .reduce((sum: number, a: CashAdjustment) => sum + Math.abs(parseFloat(a.difference)), 0);

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('cash_adjustments.title')}</h2>
                    <p className="text-muted-foreground">
                        {t('cash_adjustments.subtitle')}
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {showForm ? t('cash_adjustments.cancel') : t('cash_adjustments.new_adjustment')}
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cash_adjustments.total_surplus')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">
                            +{totalSurplus.toLocaleString()} F
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cash_adjustments.total_deficit')}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-500">
                            -{totalDeficit.toLocaleString()} F
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cash_adjustments.net_balance')}</CardTitle>
                        <Minus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            totalSurplus - totalDeficit > 0 ? 'text-emerald-500' : 
                            totalSurplus - totalDeficit < 0 ? 'text-rose-500' : ''
                        }`}>
                            {(totalSurplus - totalDeficit) > 0 ? '+' : ''}
                            {(totalSurplus - totalDeficit).toLocaleString()} F
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Form */}
            {showForm && (
                <CashAdjustmentForm stores={stores} onCancel={() => setShowForm(false)} />
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:w-64">
                        <Select value={storeFilter} onValueChange={setStoreFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('cash_adjustments.filters.all_stores')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('cash_adjustments.filters.all_stores')}</SelectItem>
                                {stores.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full md:w-48">
                        <Input 
                            type="date" 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)} 
                            placeholder={t('cash_adjustments.filters.date')}
                        />
                    </div>
                    {(dateFilter || storeFilter !== 'all') && (
                        <Button variant="ghost" onClick={() => { setStoreFilter('all'); setDateFilter(''); }}>
                            {t('cash_adjustments.filters.reset')}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <CashAdjustmentTable adjustments={adjustments} isLoading={isLoading} />
        </div>
    );
}
