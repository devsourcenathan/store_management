import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Calendar, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { RenewSubscriptionModal } from './RenewSubscriptionModal';
import { NewSubscriptionModal } from './NewSubscriptionModal';
import { SubscriptionDetailsSheet } from './SubscriptionDetailsSheet';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from "@/components/ui/Pagination";
import { ExportButton } from '@/components/ExportButton';

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
    const [viewingSubscription, setViewingSubscription] = useState<CustomerSubscription | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
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

    const {
        currentItems,
        currentPage,
        totalPages,
        goToPage: setPage,
    } = usePagination({
        totalItems: subscriptions?.length || 0,
        itemsPerPage: 10,
    });

    const paginatedSubscriptions = subscriptions ? currentItems(subscriptions) : [];

    const handleRenew = (subscription: CustomerSubscription) => {
        setSelectedSubscription(subscription);
        setRenewalModalOpen(true);
    };

    const handleViewDetails = (subscription: CustomerSubscription) => {
        setViewingSubscription(subscription);
        setDetailsOpen(true);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('subscriptions.title')}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('subscriptions.subtitle')}</p>
                </div>
                <div className="flex flex-row gap-2 sm:gap-3">
                    <ExportButton
                        data={subscriptions || []}
                        columns={[
                            { header: t('common.customer'), key: 'customer.name' },
                            { header: t('common.service'), key: 'offer.service.name' },
                            { header: t('subscriptions.offer'), key: 'offer.name' },
                            { header: t('common.status'), key: 'status' },
                            { header: t('common.end_date'), key: 'endDate' },
                        ]}
                        title={t('subscriptions.title')}
                        format="pdf"
                        variant="outline"
                        size="sm"
                    />
                    <ExportButton
                        data={subscriptions || []}
                        columns={[
                            { header: t('common.customer'), key: 'customer.name' },
                            { header: t('common.service'), key: 'offer.service.name' },
                            { header: t('subscriptions.offer'), key: 'offer.name' },
                            { header: t('common.status'), key: 'status' },
                            { header: t('common.end_date'), key: 'endDate' },
                        ]}
                        title={t('subscriptions.title')}
                        format="excel"
                        variant="outline"
                        size="sm"
                    />
                    <select
                        className="w-full xs:w-auto border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                        className="w-full xs:w-auto px-4 py-2 btn-theme-primary rounded-lg transition-colors whitespace-nowrap"
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
                        {paginatedSubscriptions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    {t('subscriptions.no_subscriptions')}
                                </td>
                            </tr>
                        ) : (
                            paginatedSubscriptions.map((subscription) => (
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
                                        <button
                                            onClick={() => handleViewDetails(subscription)}
                                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                                        >
                                            {t('common.details', 'Details')}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
            />

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

            {/* Details Sheet */}
            <SubscriptionDetailsSheet
                subscription={viewingSubscription}
                isOpen={detailsOpen}
                onClose={() => {
                    setDetailsOpen(false);
                    setViewingSubscription(null);
                }}
            />
        </div>
    );
}
