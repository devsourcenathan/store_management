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

import { MiscTransactionForm } from './components/MiscTransactionForm';
import { MiscTransactionTable, MiscTransaction } from './components/MiscTransactionTable';

export function MiscTransactionsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    
    const [showForm, setShowForm] = useState(false);
    const [storeFilter, setStoreFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
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

    // Fetch transactions
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['misc-transactions', user?.organizationId, storeFilter, typeFilter, dateFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (storeFilter && storeFilter !== 'all') params.set('storeId', storeFilter);
            if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
            if (dateFilter) {
               const start = dayjs(dateFilter).startOf('day').toISOString();
               const end = dayjs(dateFilter).endOf('day').toISOString();
               params.set('startDate', start);
               params.set('endDate', end);
            }
            
            const res = await api.get(`/misc-transactions?${params.toString()}`);
            return res.data as MiscTransaction[];
        },
        enabled: !!user?.organizationId,
    });

    // Totals
    const totalIn = transactions
        .filter((t: MiscTransaction) => t.type === 'IN')
        .reduce((sum: number, t: MiscTransaction) => sum + parseFloat(t.amount), 0);
    const totalOut = transactions
        .filter((t: MiscTransaction) => t.type === 'OUT')
        .reduce((sum: number, t: MiscTransaction) => sum + parseFloat(t.amount), 0);

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('misc_transactions.title')}</h2>
                    <p className="text-muted-foreground">
                        {t('misc_transactions.subtitle')}
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {showForm ? t('misc_transactions.cancel') : t('misc_transactions.new_transaction')}
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('misc_transactions.total_in')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">
                            +{totalIn.toLocaleString()} F
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('misc_transactions.total_out')}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-500">
                            -{totalOut.toLocaleString()} F
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('misc_transactions.net_balance')}</CardTitle>
                        <Minus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            totalIn - totalOut > 0 ? 'text-emerald-500' : 
                            totalIn - totalOut < 0 ? 'text-rose-500' : ''
                        }`}>
                            {(totalIn - totalOut) > 0 ? '+' : ''}
                            {(totalIn - totalOut).toLocaleString()} F
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Form */}
            {showForm && (
                <MiscTransactionForm stores={stores} onCancel={() => setShowForm(false)} />
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:w-64">
                        <Select value={storeFilter} onValueChange={setStoreFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('misc_transactions.filters.all_stores')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('misc_transactions.filters.all_stores')}</SelectItem>
                                {stores.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full md:w-48">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('misc_transactions.filters.all_types')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('misc_transactions.filters.all_types')}</SelectItem>
                                <SelectItem value="IN">{t('misc_transactions.filters.type_in')}</SelectItem>
                                <SelectItem value="OUT">{t('misc_transactions.filters.type_out')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full md:w-48">
                        <Input 
                            type="date" 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)} 
                            placeholder={t('misc_transactions.filters.date')}
                        />
                    </div>
                    {(dateFilter || storeFilter !== 'all' || typeFilter !== 'all') && (
                        <Button variant="ghost" onClick={() => { setStoreFilter('all'); setTypeFilter('all'); setDateFilter(''); }}>
                            {t('misc_transactions.filters.reset')}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <MiscTransactionTable transactions={transactions} isLoading={isLoading} />
        </div>
    );
}
