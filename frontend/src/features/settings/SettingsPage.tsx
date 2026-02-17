import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { OrganizationSettings } from './components/OrganizationSettings';
import { StoreList } from './components/StoreList';
import { UserList } from './components/UserList';
import { NotificationSettings } from './components/NotificationSettings';
import { PermissionsPage } from './PermissionsPage';
import { OrgLandingEditor } from '@/features/org-landing/OrgLandingEditor';
import { Building, Store as StoreIcon, Users, Globe, Bell, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Tab = 'organization' | 'stores' | 'team' | 'notifications' | 'permissions';

export function SettingsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('organization');

    const tabs = [
        { id: 'organization', label: t('settings.tabs.organization'), icon: Building, component: OrganizationSettings },
        { id: 'stores', label: t('settings.tabs.stores'), icon: StoreIcon, component: StoreList },
        { id: 'team', label: t('settings.tabs.team'), icon: Users, component: UserList },
        { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell, component: NotificationSettings },
        // { id: 'landing', label: 'Landing Page', icon: Globe, component: OrgLandingEditor },
    ];

    if (user?.role === 'OWNER') {
        tabs.push({
            id: 'permissions',
            label: t('settings.tabs.permissions'),
            icon: Shield,
            component: PermissionsPage
        } as any);
    }

    return (
        <div className="space-y-4 sm:space-y-6 pb-6">
            {/* Header */}
            <div className="px-4 sm:px-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>


            </div>

            {/* Tabs - Horizontal on all screens */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex overflow-x-auto scrollbar-hide -mb-px px-4 sm:px-0" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 sm:px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content */}
            <main className="px-4 sm:px-0">
                {tabs.map((tab) => {
                    if (tab.id !== activeTab) return null;
                    const Component = tab.component;
                    return (
                        <div key={tab.id} className="animate-fadeIn">
                            <Component />
                        </div>
                    );
                })}
            </main>
        </div>
    );
}
