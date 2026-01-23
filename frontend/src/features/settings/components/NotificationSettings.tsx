import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Save } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';

interface NotificationPreferences {
    emailNotificationsEnabled: boolean;
    dailyReportEnabled: boolean;
    weeklyReportEnabled: boolean;
    monthlyReportEnabled: boolean;
    yearlyReportEnabled: boolean;
}

export function NotificationSettings() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        emailNotificationsEnabled: true,
        dailyReportEnabled: false,
        weeklyReportEnabled: false,
        monthlyReportEnabled: false,
        yearlyReportEnabled: false,
    });

    useEffect(() => {
        if (user) {
            setPreferences({
                emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
                dailyReportEnabled: user.dailyReportEnabled ?? false,
                weeklyReportEnabled: user.weeklyReportEnabled ?? false,
                monthlyReportEnabled: user.monthlyReportEnabled ?? false,
                yearlyReportEnabled: user.yearlyReportEnabled ?? false,
            });
        }
    }, [user]);

    const handleToggle = (key: keyof NotificationPreferences) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            await api.patch(`/users/${user.id}/notification-preferences`, preferences);
            toast.success(t('settings.notifications.success'));
        } catch (error) {
            console.error('Failed to update notification preferences:', error);
            toast.error(t('settings.notifications.error'));
        } finally {
            setSaving(false);
        }
    };

    const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button
            type="button"
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {t('settings.notifications.title')}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {t('settings.notifications.subtitle')}
                </p>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                {/* Master Toggle */}
                <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('settings.notifications.emailEnabled.label')}
                                </h4>
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {t('settings.notifications.emailEnabled.description')}
                            </p>
                        </div>
                        <ToggleSwitch
                            enabled={preferences.emailNotificationsEnabled}
                            onChange={() => handleToggle('emailNotificationsEnabled')}
                        />
                    </div>
                </div>

                {/* Report Toggles */}
                <div className={`transition-opacity ${preferences.emailNotificationsEnabled ? 'opacity-100' : 'opacity-50'}`}>
                    {/* Daily Report */}
                    <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('settings.notifications.dailyReport.label')}
                                </h4>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {t('settings.notifications.dailyReport.description')}
                                </p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.dailyReportEnabled && preferences.emailNotificationsEnabled}
                                onChange={() => preferences.emailNotificationsEnabled && handleToggle('dailyReportEnabled')}
                            />
                        </div>
                    </div>

                    {/* Weekly Report */}
                    <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('settings.notifications.weeklyReport.label')}
                                </h4>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {t('settings.notifications.weeklyReport.description')}
                                </p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.weeklyReportEnabled && preferences.emailNotificationsEnabled}
                                onChange={() => preferences.emailNotificationsEnabled && handleToggle('weeklyReportEnabled')}
                            />
                        </div>
                    </div>

                    {/* Monthly Report */}
                    <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('settings.notifications.monthlyReport.label')}
                                </h4>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {t('settings.notifications.monthlyReport.description')}
                                </p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.monthlyReportEnabled && preferences.emailNotificationsEnabled}
                                onChange={() => preferences.emailNotificationsEnabled && handleToggle('monthlyReportEnabled')}
                            />
                        </div>
                    </div>

                    {/* Yearly Report */}
                    <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('settings.notifications.yearlyReport.label')}
                                </h4>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {t('settings.notifications.yearlyReport.description')}
                                </p>
                            </div>
                            <ToggleSwitch
                                enabled={preferences.yearlyReportEnabled && preferences.emailNotificationsEnabled}
                                onChange={() => preferences.emailNotificationsEnabled && handleToggle('yearlyReportEnabled')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" />
                    {saving ? t('common.saving') : t('settings.notifications.save')}
                </button>
            </div>
        </div>
    );
}
