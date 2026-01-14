import { useState } from 'react';
import { OrganizationSettings } from './components/OrganizationSettings';
import { StoreList } from './components/StoreList';
import { UserList } from './components/UserList';
import { OrgLandingEditor } from '@/features/org-landing/OrgLandingEditor';
import { Building, Store as StoreIcon, Users, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Tab = 'organization' | 'stores' | 'team';

export function SettingsPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('organization');

    const tabs = [
        { id: 'organization', label: t('settings.tabs.organization'), icon: Building, component: OrganizationSettings },
        { id: 'stores', label: t('settings.tabs.stores'), icon: StoreIcon, component: StoreList },
        { id: 'team', label: t('settings.tabs.team'), icon: Users, component: UserList },
        { id: 'landing', label: 'Landing Page', icon: Globe, component: OrgLandingEditor },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
                <p className="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1">
                    {tabs.map((tab) => {
                        if (tab.id !== activeTab) return null;
                        const Component = tab.component;
                        return (
                            <div key={tab.id}>
                                <Component />
                            </div>
                        );
                    })}
                </main>
            </div>
        </div>
    );
}
