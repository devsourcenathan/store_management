import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import { dangerZoneApi } from '@/services/api';
import { isDesktopBundle } from '@/lib/apiBaseUrl';

type ResetTarget = 'SALES' | 'INVENTORY' | 'CUSTOMERS' | 'SUPPLIERS' | 'ALL' | 'LOCAL_DB';

export function DangerZonePage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    
    const [selectedTarget, setSelectedTarget] = useState<ResetTarget | null>(null);
    const [password, setPassword] = useState('');
    const [confirmationText, setConfirmationText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    if (user?.role !== 'OWNER') {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold mb-2">{t('settings.danger_zone.access_denied')}</h2>
                    <p className="text-gray-600">{t('settings.danger_zone.owner_only')}</p>
                </div>
            </div>
        );
    }

    const resetOptions: { id: ResetTarget, title: string, description: string, isDesktopOnly?: boolean }[] = [
        { id: 'SALES', title: t('settings.danger_zone.options.sales.title'), description: t('settings.danger_zone.options.sales.desc') },
        { id: 'INVENTORY', title: t('settings.danger_zone.options.inventory.title'), description: t('settings.danger_zone.options.inventory.desc') },
        { id: 'CUSTOMERS', title: t('settings.danger_zone.options.customers.title'), description: t('settings.danger_zone.options.customers.desc') },
        { id: 'SUPPLIERS', title: t('settings.danger_zone.options.suppliers.title'), description: t('settings.danger_zone.options.suppliers.desc') },
        { id: 'ALL', title: t('settings.danger_zone.options.all.title'), description: t('settings.danger_zone.options.all.desc') },
    ];

    if (isDesktopBundle()) {
        resetOptions.push({
            id: 'LOCAL_DB',
            title: t('settings.danger_zone.options.local_db.title'),
            description: t('settings.danger_zone.options.local_db.desc'),
            isDesktopOnly: true
        });
    }

    const handleSelectTarget = (target: ResetTarget) => {
        setSelectedTarget(target);
        setPassword('');
        setConfirmationText('');
        setShowModal(true);
    };

    const handleExecuteReset = async () => {
        if (!selectedTarget) return;
        
        const confirmWord = t('settings.danger_zone.modal.confirm_word');
        if (confirmationText !== confirmWord) {
            toast.error(t('settings.danger_zone.errors.type_confirm'));
            return;
        }

        if (selectedTarget !== 'LOCAL_DB' && !password) {
            toast.error(t('settings.danger_zone.errors.password_required'));
            return;
        }

        try {
            setIsSubmitting(true);
            
            if (selectedTarget === 'LOCAL_DB') {
                await dangerZoneApi.hardResetLocalDb();
                toast.success(t('settings.danger_zone.success.local_db'));
                // L'application va crasher ou se fermer très bientôt
            } else {
                await dangerZoneApi.resetModule({ target: selectedTarget, password });
                toast.success(t('settings.danger_zone.success.action'));
                setShowModal(false);
            }
        } catch (error: any) {
            console.error('Reset error:', error);
            const backendMsg = error.response?.data?.message;
            let displayMsg = t('settings.danger_zone.errors.action_failed');
            
            if (backendMsg === 'Mot de passe incorrect') {
                displayMsg = t('settings.danger_zone.errors.invalid_password');
            } else if (backendMsg === 'User not found') {
                displayMsg = t('settings.danger_zone.errors.user_not_found');
            } else if (backendMsg) {
                displayMsg = backendMsg;
            }
            
            toast.error(displayMsg);
            setIsSubmitting(false);
        } finally {
            if (selectedTarget !== 'LOCAL_DB') {
                setIsSubmitting(false);
            }
        }
    };

    const selectedOption = resetOptions.find(o => o.id === selectedTarget);

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500 flex-shrink-0" />
                    <div>
                        <h1 className="text-2xl font-bold text-red-900 dark:text-red-400 mb-2">{t('settings.danger_zone.title')}</h1>
                        <p className="text-red-800 dark:text-red-300">
                            {t('settings.danger_zone.warning_text')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {resetOptions.map((option) => (
                    <div key={option.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 rounded-lg shadow-sm">
                        <div className="mb-4 md:mb-0 md:pr-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                {option.title}
                                {option.isDesktopOnly && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Desktop</span>}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{option.description}</p>
                        </div>
                        <button
                            onClick={() => handleSelectTarget(option.id)}
                            className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-medium rounded-lg transition-colors border border-red-300 dark:border-red-800"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('settings.danger_zone.reset_btn')}
                        </button>
                    </div>
                ))}
            </div>

            {showModal && selectedOption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-4">
                            <AlertTriangle className="w-8 h-8" />
                            <h2 className="text-xl font-bold">{t('settings.danger_zone.modal.title')}</h2>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            {t('settings.danger_zone.modal.about_to')} <strong>{selectedOption.title}</strong>.<br/>
                            {t('settings.danger_zone.modal.warning')}
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('settings.danger_zone.modal.type_confirm')}
                                </label>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    placeholder={t('settings.danger_zone.modal.confirm_word')}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            {selectedOption.id !== 'LOCAL_DB' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('settings.danger_zone.modal.password_label')}
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t('settings.danger_zone.modal.password_placeholder')}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleExecuteReset}
                                disabled={isSubmitting || confirmationText !== t('settings.danger_zone.modal.confirm_word') || (selectedTarget !== 'LOCAL_DB' && !password)}
                                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center"
                            >
                                {isSubmitting ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    t('settings.danger_zone.modal.destroy_btn')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
