import { useSync } from '@/offline/SyncProvider';
import { isOfflineEnabled } from '@/lib/apiBaseUrl';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export function SyncStatus() {
    const { isOnline, isSyncing, lastSyncAt, pendingOperations, sync } = useSync();
    if (!isOfflineEnabled()) return null;
    const { t, i18n } = useTranslation();

    const locale = i18n.language === 'fr' ? fr : enUS;

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
            {/* Status Icon */}
            <div className="flex items-center gap-2">
                {isSyncing ? (
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                ) : !isOnline ? (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                ) : pendingOperations > 0 ? (
                    <Clock className="h-4 w-4 text-yellow-500" />
                ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                )}

                {/* Status Text */}
                <div className="flex flex-col">
                    <span className="text-sm font-medium">
                        {isSyncing
                            ? t('offline.sync.syncing')
                            : !isOnline
                                ? t('offline.sync.offline')
                                : pendingOperations > 0
                                    ? t('offline.sync.pending', { count: pendingOperations })
                                    : t('offline.sync.upToDate')}
                    </span>
                    {lastSyncAt && (
                        <span className="text-xs text-muted-foreground">
                            {t('offline.sync.lastSync')}{' '}
                            {formatDistanceToNow(lastSyncAt, { addSuffix: true, locale })}
                        </span>
                    )}
                </div>
            </div>

            {/* Sync Button */}
            {isOnline && !isSyncing && pendingOperations > 0 && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={sync}
                    className="ml-auto"
                >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {t('offline.sync.syncNow')}
                </Button>
            )}
        </div>
    );
}
