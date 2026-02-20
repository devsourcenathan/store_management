import React from 'react';
import { CreditDetails, CreditSaleType } from '@/types/credit';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface CreditDetailsWidgetProps {
    creditDetails: CreditDetails;
    paidAmount: number; // Overall paid amount for the sale
}

export const CreditDetailsWidget: React.FC<CreditDetailsWidgetProps> = ({ creditDetails, paidAmount }) => {
    const { t } = useTranslation();

    // Calculate progress
    const total = creditDetails.totalAmount;
    const progress = Math.min(100, Math.max(0, (paidAmount / total) * 100));
    const remaining = Math.max(0, total - paidAmount);

    // Determine status color/icon
    const isOverdue = creditDetails.dueDate && new Date(creditDetails.dueDate) < new Date() && remaining > 0;
    const isPaid = remaining <= 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {t('credit.details_title', 'Détails du Crédit')}
            </h4>

            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('credit.remaining', 'Restant à payer')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{remaining.toLocaleString()} FCFA</p>
                </div>
                <div className={`p-3 rounded-lg ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900/50'}`}>
                    <p className={`text-xs mb-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {t('credit.due_date', 'Date d\'échéance')}
                    </p>
                    <div className="flex items-center gap-1">
                        <Calendar className={`w-4 h-4 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`} />
                        <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {creditDetails.dueDate ? new Date(creditDetails.dueDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Type Indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/10 p-2 rounded-md">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>
                    {creditDetails.saleType === CreditSaleType.IMMEDIATE_DELIVERY
                        ? t('pos.immediate_delivery', 'Livraison immédiate')
                        : t('pos.deferred_delivery', 'Livraison après paiement complet')}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600 dark:text-gray-400">{Math.round(progress)}% {t('common.paid', 'Payé')}</span>
                    <span className="text-gray-900 dark:text-gray-100">{paidAmount.toLocaleString()} / {total.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isPaid ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
