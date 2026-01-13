import { useState } from 'react';
import { OrganizationSettings } from './components/OrganizationSettings';
import { StoreList } from './components/StoreList';
import { UserList } from './components/UserList';
import { Building, Store as StoreIcon, Users } from 'lucide-react';

type Tab = 'organization' | 'stores' | 'team';

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('organization');

    const tabs = [
        { id: 'organization', label: 'Organization', icon: Building, component: OrganizationSettings },
        { id: 'stores', label: 'Stores', icon: StoreIcon, component: StoreList },
        { id: 'team', label: 'Team Members', icon: Users, component: UserList },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-600">Manage your organization preferences</p>
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
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
