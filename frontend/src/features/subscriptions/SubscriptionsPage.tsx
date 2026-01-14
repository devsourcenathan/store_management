import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Calendar, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { RenewSubscriptionModal } from './RenewSubscriptionModal';
import { NewSubscriptionModal } from './NewSubscriptionModal';

interface CustomerSubscription {
    id: string;
    customerId: string;
    customer: {
        id: string;
        name: string;
        phone?: string;
    };
    offerId: string;
    offer: {
        id: string;
        name: string;
        basePrice: number;
        duration: number;
        service: {
            id: string;
            name: string;
        };
    };
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
    startDate: string;
    endDate?: string;
    autoRenew: boolean;
    createdAt: string;
}

export function SubscriptionsPage() {
    const { t } = useTranslation();
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [renewalModalOpen, setRenewalModalOpen] = useState(false);
    const [newSubscriptionModalOpen, setNewSubscriptionModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscription | null>(null);
    const queryClient = useQueryClient();

    const { data: subscriptions, isLoading } = useQuery<CustomerSubscription[]>({
        queryKey: ['subscriptions', selectedStatus],
        queryFn: async () => {
            const response = await api.get('/subscriptions');
            let subs = response.data;

            if (selectedStatus !== 'ALL') {
                subs = subs.filter((s: CustomerSubscription) => s.status === selectedStatus);
            }

            return subs;
        },
    });

    const handleRenew = (subscription: CustomerSubscription) => {
        setSelectedSubscription(subscription);
        setRenewalModalOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'EXPIRED':
                return 'bg-red-100 text-red-800';
            case 'SUSPENDED':
                return 'bg-yellow-100 text-yellow-800';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <CheckCircle className="w-4 h-4" />;
            case 'EXPIRED':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Calendar className="w-4 h-4" />;
        }
    };

    const isExpiringSoon = (endDate?: string) => {
        if (!endDate) return false;
        const end = new Date(endDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    };

    if (isLoading) return <div className="p-8 text-center">Loading subscriptions...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('subscriptions.title')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('subscriptions.subtitle')}</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="ALL">{t('common.all', 'All Status')}</option>
                        <option value="ACTIVE">{t('common.active', 'Active')}</option>
                        <option value="EXPIRED">{t('common.expired', 'Expired')}</option>
                        <option value="SUSPENDED">{t('common.suspended', 'Suspended')}</option>
                        <option value="CANCELLED">{t('common.cancelled', 'Cancelled')}</option>
                    </select>
                    <button
                        onClick={() => setNewSubscriptionModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {t('subscriptions.new_subscription')}
                    </button>
                </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.customer', 'Customer')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.service', 'Service')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('subscriptions.offer')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status', 'Status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.end_date', 'End Date')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {subscriptions?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    {t('subscriptions.no_subscriptions')}
                                </td>
                            </tr>
                        ) : (
                            subscriptions?.map((subscription) => (
                                <tr key={subscription.id} className={isExpiringSoon(subscription.endDate) ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{subscription.customer.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{subscription.customer.phone || 'N/A'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {subscription.offer.service.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{subscription.offer.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{subscription.offer.basePrice} FCFA / {subscription.offer.duration}j</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                                            {getStatusIcon(subscription.status)}
                                            <span>{subscription.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {subscription.endDate ? (
                                            <div>
                                                <div>{new Date(subscription.endDate).toLocaleDateString()}</div>
                                                {isExpiringSoon(subscription.endDate) && (
                                                    <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{t('subscriptions.expires_soon')}</div>
                                                )}
                                            </div>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleRenew(subscription)}
                                            className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                                            disabled={subscription.status === 'CANCELLED'}
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            <span>{t('subscriptions.renew')}</span>
                                        </button>
                                        <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300">{t('common.details', 'Details')}</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Renewal Modal */}
            {renewalModalOpen && selectedSubscription && (
                <RenewSubscriptionModal
                    subscription={selectedSubscription}
                    onClose={() => {
                        setRenewalModalOpen(false);
                        setSelectedSubscription(null);
                    }}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
                        setRenewalModalOpen(false);
                        setSelectedSubscription(null);
                    }}
                />
            )}
            {/* New Subscription Modal */}
            {newSubscriptionModalOpen && (
                <NewSubscriptionModal
                    onClose={() => setNewSubscriptionModalOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
                        setNewSubscriptionModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
