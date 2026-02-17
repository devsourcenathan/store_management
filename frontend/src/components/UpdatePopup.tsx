import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export function UpdatePopup() {
    const { needRefresh, updateServiceWorker, setNeedRefresh } = usePWAUpdate();
    const { t } = useTranslation();

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 sm:px-0">
            <div className="bg-popover text-popover-foreground border shadow-lg rounded-lg p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="p-2 bg-primary/10 rounded-full h-fit">
                            <RefreshCw className="h-5 w-5 text-primary animate-spin-slow" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-medium leading-none">
                                {t('common.updateAvailable', 'New version available')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {t('common.updateDescription', 'A new version of the app is available. Update to get the latest features.')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setNeedRefresh(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex gap-2 justify-end w-full">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNeedRefresh(false)}
                    >
                        {t('common.later', 'Later')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => updateServiceWorker(true)}
                        className="gap-2"
                    >
                        <RefreshCw className="h-3 w-3" />
                        {t('common.update', 'Update')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
