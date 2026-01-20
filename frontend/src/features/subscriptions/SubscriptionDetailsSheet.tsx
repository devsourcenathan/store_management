import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/Sheet";
import { useTranslation } from 'react-i18next';
import { Calendar, User, Package, CreditCard, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface SubscriptionDetailsSheetProps {
    subscription: any;
    isOpen: boolean;
    onClose: () => void;
}

export function SubscriptionDetailsSheet({ subscription, isOpen, onClose }: SubscriptionDetailsSheetProps) {
    const { t } = useTranslation();

    if (!subscription) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'PPP');
        } catch (e) {
            return dateString;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'EXPIRED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'CANCELLED': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="overflow-y-auto w-[400px] sm:w-[540px]">
                <SheetHeader className="mb-6">
                    <SheetTitle>{t('subscriptions.details_title', 'Subscription Details')}</SheetTitle>
                    <SheetDescription>
                        {t('subscriptions.details_subtitle', 'View complete information about this subscription.')}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Status Badge */}
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('common.status')}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(subscription.status)}`}>
                            {subscription.status}
                        </span>
                    </div>

                    {/* Customer Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                            <User className="w-4 h-4 mr-2 text-blue-500" />
                            {t('common.customer', 'Customer')}
                        </h3>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('fields.name', 'Name')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{subscription.customer.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('fields.phone', 'Phone')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{subscription.customer.phone || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('fields.id', 'ID')}</span>
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{subscription.customer.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Plan / Offer Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                            <Package className="w-4 h-4 mr-2 text-purple-500" />
                            {t('common.plan', 'Plan Details')}
                        </h3>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.service', 'Service')}</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{subscription.offer.service.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('subscriptions.offer')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{subscription.offer.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('subscriptions.price')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{subscription.offer.basePrice} FCFA</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('subscriptions.duration')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{subscription.offer.duration} {t('common.days', 'days')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-orange-500" />
                            {t('common.timeline', 'Timeline')}
                        </h3>
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.start_date', 'Start Date')}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(subscription.startDate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.end_date', 'End Date')}</span>
                                <span className={`text-sm font-medium ${subscription.status === 'EXPIRED' ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {formatDate(subscription.endDate)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.created_at', 'Created At')}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(subscription.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Auto Renew Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex items-start">
                        <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">{t('subscriptions.auto_renew', 'Auto-Renewal')}</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                {subscription.autoRenew
                                    ? t('subscriptions.auto_renew_enabled', 'This subscription is set to automatically renew at the end of the billing period.')
                                    : t('subscriptions.auto_renew_disabled', 'Auto-renewal is disabled for this subscription.')
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
