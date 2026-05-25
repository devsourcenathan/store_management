import { useSync } from '@/offline/SyncProvider';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isOfflineEnabled } from '@/lib/apiBaseUrl';

export function OfflineIndicator() {
    const { isOnline, isSyncing, pendingOperations } = useSync();
    if (!isOfflineEnabled()) return null;
    const { t } = useTranslation();

    if (isOnline && !isSyncing && pendingOperations === 0) {
        return null; // Don't show anything when everything is fine
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
                    ${!isOnline ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}
                    transition-all duration-300 animate-in slide-in-from-bottom-5
                `}
            >
                {!isOnline ? (
                    <>
                        <WifiOff className="h-4 w-4" />
                        <span className="text-sm font-medium">{t('offline.indicator.offline')}</span>
                    </>
                ) : isSyncing ? (
                    <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">{t('offline.indicator.syncing')}</span>
                    </>
                ) : pendingOperations > 0 ? (
                    <>
                        <Wifi className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            {t('offline.indicator.pending', { count: pendingOperations })}
                        </span>
                    </>
                ) : null}
            </div>
        </div>
    );
}
