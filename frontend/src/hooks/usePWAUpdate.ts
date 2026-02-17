import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function usePWAUpdate() {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);
    const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | undefined>(undefined);

    useEffect(() => {
        const updateServiceWorker = registerSW({
            onNeedRefresh() {
                setNeedRefresh(true);
            },
            onOfflineReady() {
                setOfflineReady(true);
            },
        });
        setUpdateSW(() => updateServiceWorker);
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
