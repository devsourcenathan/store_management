import { useState } from 'react';
import { useStore } from './StoreProvider';
import { useTranslation } from 'react-i18next';
import { Store, Check, ChevronDown, Settings } from 'lucide-react';
import { EditStoreModal } from './EditStoreModal';

export function StoreSelector() {
    const { t } = useTranslation();
    const { currentStore, setCurrentStore, stores } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<any>(null);

    if (!currentStore && stores.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[200px]"
            >
                <div className="p-1 bg-blue-100 rounded text-blue-600">
                    <Store className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('stores.current_store', 'Current Store')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {currentStore ? currentStore.name : t('stores.select_store', 'Select Store')}
                    </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('stores.my_stores', 'My Stores')}</h3>
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            {stores.map(store => (
                                <div
                                    key={store.id}
                                    className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 group ${currentStore?.id === store.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                        }`}
                                >
                                    <button
                                        onClick={() => {
                                            setCurrentStore(store);
                                            setIsOpen(false);
                                        }}
                                        className="flex-1 text-left"
                                    >
                                        <p className={`text-sm font-medium ${currentStore?.id === store.id ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                            }`}>
                                            {store.name}
                                        </p>
                                        {store.address && (
                                            <p className="text-xs text-gray-500 truncate">{store.address}</p>
                                        )}
                                    </button>
                                    <div className="flex items-center space-x-1">
                                        {currentStore?.id === store.id && (
                                            <Check className="w-4 h-4 text-blue-600" />
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingStore(store);
                                                setIsEditModalOpen(true);
                                                setIsOpen(false);
                                            }}
                                            className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Edit store"
                                        >
                                            <Settings className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </>
            )}

            {/* Edit Store Modal */}
            {isEditModalOpen && editingStore && (
                <EditStoreModal
                    store={editingStore}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingStore(null);
                    }}
                    onSuccess={() => {
                        window.location.reload(); // Refresh to update user context with new store info
                    }}
                />
            )}
        </div>
    );
}
