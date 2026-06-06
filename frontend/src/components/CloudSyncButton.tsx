import { useSync } from '@/offline/SyncProvider';
import { isDesktopBundle } from '@/lib/apiBaseUrl';
import { RefreshCw, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export function CloudSyncButton() {
    const { isSyncing, pendingOperations, lastSyncAt, isConfigured, sync } = useSync();
    const { t, i18n } = useTranslation();

    if (!isDesktopBundle() || !isConfigured) return null;

    const locale = i18n.language === 'fr' ? fr : enUS;

    const title = isSyncing
        ? t('offline.sync.syncing')
        : lastSyncAt
            ? `${t('offline.sync.lastSync')} ${formatDistanceToNow(lastSyncAt, { addSuffix: true, locale })}`
            : t('offline.sync.syncNow');

    return (
        <button
            onClick={sync}
            disabled={isSyncing}
            className="relative flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target"
            title={title}
            aria-label={title}
        >
            <Cloud className={`w-4 h-4 ${isSyncing ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`} />
            <RefreshCw
                className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-500' : 'text-gray-600 dark:text-gray-300'}`}
            />
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden lg:inline">
                {isSyncing ? t('offline.sync.syncing') : t('offline.sync.syncNow')}
            </span>
            {pendingOperations > 0 && !isSyncing && (
                <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center text-[10px] font-semibold bg-yellow-400 text-yellow-900 rounded-full">
                    {pendingOperations > 99 ? '99+' : pendingOperations}
                </span>
            )}
        </button>
    );
}
