import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { DollarSign, TrendingUp, AlertTriangle, Plus } from 'lucide-react';

interface SubscriptionAccount {
    id: string;
    serviceId: string;
    storeId: string;
    balance: number;
    service: {
        id: string;
        name: string;
        provider: string;
    };
}

interface BalanceEntry {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    source: 'INJECTION' | 'SUBSCRIPTION' | 'REFUND' | 'CORRECTION';
    amount: number;
    reference?: string;
    notes?: string;
    createdAt: string;
}

interface BalanceAlert {
    id: string;
    type: 'NEGATIVE' | 'LOW_BALANCE';
    threshold?: number;
    currentBalance: number;
    resolved: boolean;
    createdAt: string;
}

export function BalanceManagementPage() {
    const { t } = useTranslation();
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [injectionModalOpen, setInjectionModalOpen] = useState(false);
    const [injectionAmount, setInjectionAmount] = useState(0);
    const [injectionNotes, setInjectionNotes] = useState('');
    const queryClient = useQueryClient();

    const { data: accounts } = useQuery<SubscriptionAccount[]>({
        queryKey: ['subscription-accounts'],
        queryFn: async () => {
            const response = await api.get('/subscriptions/accounts');
            if (response.data.length > 0 && !selectedAccountId) {
                setSelectedAccountId(response.data[0].id);
            }
            return response.data;
        },
    });

    const { data: balanceData } = useQuery({
        queryKey: ['account-balance', selectedAccountId],
        queryFn: async () => {
            if (!selectedAccountId) return null;
            const response = await api.get(`/subscriptions/accounts/${selectedAccountId}/balance`);
            return response.data;
        },
        enabled: !!selectedAccountId,
    });

    const { data: history } = useQuery<BalanceEntry[]>({
        queryKey: ['balance-history', selectedAccountId],
        queryFn: async () => {
            if (!selectedAccountId) return [];
            const response = await api.get(`/subscriptions/accounts/${selectedAccountId}/history`);
            return response.data;
        },
        enabled: !!selectedAccountId,
    });

    const { data: alerts } = useQuery<BalanceAlert[]>({
        queryKey: ['balance-alerts', selectedAccountId],
        queryFn: async () => {
            if (!selectedAccountId) return [];
            const response = await api.get(`/subscriptions/accounts/${selectedAccountId}/alerts`);
            return response.data;
        },
        enabled: !!selectedAccountId,
    });

    const injectMutation = useMutation({
        mutationFn: async (data: { amount: number; notes?: string }) => {
            return api.post(`/subscriptions/accounts/${selectedAccountId}/inject`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['account-balance'] });
            queryClient.invalidateQueries({ queryKey: ['balance-history'] });
            queryClient.invalidateQueries({ queryKey: ['balance-alerts'] });
            setInjectionModalOpen(false);
            setInjectionAmount(0);
            setInjectionNotes('');
        },
    });

    const resolveAlertMutation = useMutation({
        mutationFn: async (alertId: string) => {
            return api.patch(`/subscriptions/alerts/${alertId}/resolve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['balance-alerts'] });
        },
    });

    const handleInject = (e: React.FormEvent) => {
        e.preventDefault();
        injectMutation.mutate({ amount: injectionAmount, notes: injectionNotes });
    };

    const selectedAccount = accounts?.find(a => a.id === selectedAccountId);
    const calculatedBalance = balanceData?.calculatedBalance || 0;

    return (
        <div className="space-y-6">
            < div className="flex justify-between items-center">
                < div >
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('balance.title')}</h2>
                    < p className="text-gray-600 dark:text-gray-400">{t('balance.subtitle')}</p>
                </div >
                <div className="flex space-x-3">
                    {
                        accounts && accounts.length > 0 && (
                            <select
                                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)
                                }
                            >
                                {
                                    accounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.service.name} ({account.service.provider})
                                        </option>
                                    ))
                                }
                            </select >
                        )
                    }
                    <button
                        onClick={() => setInjectionModalOpen(true)}
                        disabled={!selectedAccountId}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        < span > {t('balance.inject_balance')}</span >
                    </button >
                </div>
            </div>

            {/* Balance Overview */}
            {
                selectedAccount && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        < div className="bg-white rounded-lg shadow p-6\">
                            < div className="flex items-center justify-between\">
                                <div>
                                    <p className="text-sm text-gray-600">{t('balance.current_balance')}</p>
                                    <p className={`text-3xl font-bold ${calculatedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {calculatedBalance.toLocaleString()} FCFA
                                    </p>
                                </div>
                                <DollarSign className={`w-12 h-12 ${calculatedBalance < 0 ? 'text-red-400' : 'text-green-400'}`} />
                            </div >
                        </div >

                        <div className="bg-white rounded-lg shadow p-6">
                            < div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('common.service', 'Service')}</p>
                                    <p className="text-xl font-bold text-gray-900">{selectedAccount.service.name}</p>
                                    <p className="text-sm text-gray-500">{selectedAccount.service.provider}</p>
                                </div>
                                <TrendingUp className="w-12 h-12 text-blue-400" />
                            </div >
                        </div >

                        <div className="bg-white rounded-lg shadow p-6">
                            < div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('balance.active_alerts')}</p>
                                    <p className="text-3xl font-bold text-orange-600">{alerts?.filter(a => !a.resolved).length || 0}</p>
                                </div>
                                <AlertTriangle className="w-12 h-12 text-orange-400" />
                            </div >
                        </div >
                    </div >
                )}

            {/* Alerts */}
            {
                alerts && alerts.filter(a => !a.resolved).length > 0 && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{t('balance.active_alerts')}</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {
                                alerts.filter(a => !a.resolved).map(alert => (
                                    <div key={alert.id} className="px-6 py-4 flex items-center justify-between">
                                        < div className="flex items-center space-x-3">
                                            < AlertTriangle className={`w-5 h-5 ${alert.type === 'NEGATIVE' ? 'text-red-500' : 'text-yellow-500'}`} />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {alert.type === 'NEGATIVE' ? t('balance.negative_balance') : t('balance.low_balance')}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Current: {alert.currentBalance.toLocaleString()} FCFA
                                                    {alert.threshold && ` (Threshold: ${alert.threshold.toLocaleString()} FCFA)`}
                                                </p >
                                                <p className="text-xs text-gray-400">{new Date(alert.createdAt).toLocaleString()}</p>
                                            </div >
                                        </div >
                                        <button
                                            onClick={() => resolveAlertMutation.mutate(alert.id)}
                                            className="text-sm text-blue-600 hover:text-blue-900"
                                        >
                                            Resolve
                                        </button >
                                    </div >
                                ))
                            }
                        </div >
                    </div >
                )}

            {/* Balance History */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">{t('balance.history')}</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.date', 'Date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.type', 'Type')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.source', 'Source')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.amount', 'Amount')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.notes', 'Notes')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {
                            history?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        {t('balance.no_history', 'No balance movements yet.')}
                                    </td>
                                </tr >
                            ) : (
                                history?.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(entry.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            < span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${entry.type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {entry.type}
                                            </span >
                                        </td >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.source}</td>
                                        < td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${entry.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {entry.type === 'CREDIT' ? '+' : '-'}{entry.amount.toLocaleString()} FCFA
                                        </td >
                                        <td className="px-6 py-4 text-sm text-gray-500">{entry.notes || '-'}</td>
                                    </tr >
                                ))
                            )}
                    </tbody >
                </table >
            </div >

            {/* Injection Modal */}
            {
                injectionModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black/80 flex items-center justify-center z-50">
                        < div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('balance.inject_modal_title')}</h3>
                                < button onClick={() => setInjectionModalOpen(false)
                                } className="text-gray-400 hover:text-gray-600">
                                    < svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        < path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg >
                                </button >
                            </div >
                            <form onSubmit={handleInject} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.service', 'Service')}</label>
                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedAccount?.service.name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.amount', 'Amount')} (FCFA)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                        value={injectionAmount}
                                        onChange={(e) => setInjectionAmount(parseFloat(e.target.value) || 0)}
                                    />
                                </div >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.notes', 'Notes')} (optional)</label>
                                    <textarea
                                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 dark:bg-gray-700 dark:text-white"
                                        rows={3}
                                        value={injectionNotes}
                                        onChange={(e) => setInjectionNotes(e.target.value)}
                                        placeholder={t('balance.notes_placeholder', 'e.g., Morning balance top-up')}
                                    />
                                </div >
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setInjectionModalOpen(false)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {t('common.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={injectMutation.isPending || injectionAmount <= 0}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {injectMutation.isPending ? t('common.processing') : t('balance.inject_balance')}
                                    </button >
                                </div >
                            </form >
                        </div >
                    </div >
                )}
        </div >
    );
}
