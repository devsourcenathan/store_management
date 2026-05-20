import { useState, useEffect } from 'react';
import { isDesktopBundle } from '@/lib/apiBaseUrl';

export function usePWAUpdate() {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);
    const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        if (isDesktopBundle()) return;

        import('virtual:pwa-register').then(({ registerSW }) => {
            const updateServiceWorker = registerSW({
                onNeedRefresh() {
                    setNeedRefresh(true);
                },
                onOfflineReady() {
                    setOfflineReady(true);
                },
            });
            setUpdateSW(() => updateServiceWorker);
        });
    }, []);

    const updateServiceWorker = async (reloadPage = true) => {
        if (updateSW) {
            await updateSW(reloadPage);
        }
    };

    return {
        needRefresh,
        offlineReady,
        updateServiceWorker,
        setNeedRefresh,
    };
}
