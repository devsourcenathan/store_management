import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Check if user has dismissed the prompt before
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (!dismissed) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('PWA installed');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    if (!showPrompt || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-2xl p-4 animate-in slide-in-from-bottom-5">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Download className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-1">
                            {t('offline.pwa.installTitle')}
                        </h3>
                        <p className="text-sm text-white/90">
                            {t('offline.pwa.installDescription')}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={handleInstall}
                        className="flex-1 bg-white text-blue-600 hover:bg-white/90"
                    >
                        {t('offline.pwa.install')}
                    </Button>
                    <Button
                        onClick={handleDismiss}
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                    >
                        {t('offline.pwa.later')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
