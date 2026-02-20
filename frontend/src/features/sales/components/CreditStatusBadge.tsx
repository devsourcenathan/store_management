import React from 'react';
import { CreditStatus } from '@/types/credit';
import { useTranslation } from 'react-i18next';

interface CreditStatusBadgeProps {
    status: CreditStatus | string;
}

export const CreditStatusBadge: React.FC<CreditStatusBadgeProps> = ({ status }) => {
    const { t } = useTranslation();

    const getStatusColor = (status: string) => {
        switch (status) {
            case CreditStatus.ACTIVE:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case CreditStatus.COMPLETED:
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case CreditStatus.OVERDUE:
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case CreditStatus.CANCELLED:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case CreditStatus.ACTIVE:
                return t('credit.status.active', 'Actif');
            case CreditStatus.COMPLETED:
                return t('credit.status.completed', 'Soldé');
            case CreditStatus.OVERDUE:
                return t('credit.status.overdue', 'En retard');
            case CreditStatus.CANCELLED:
                return t('credit.status.cancelled', 'Annulé');
            default:
                return status;
        }
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status as string)}`}>
            {getStatusLabel(status as string)}
        </span>
    );
};
