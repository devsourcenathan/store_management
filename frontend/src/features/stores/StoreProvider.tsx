import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/features/auth/useAuth';

interface Store {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    receiptFooter?: string;
    organizationId: string;
}

interface StoreContextType {
    currentStore: Store | null;
    setCurrentStore: (store: Store) => void;
    stores: Store[];
    isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user && user.stores) {
            // Extract stores from user object (user.stores is UserStore[] which has { store: Store })
            const userStores = user.stores.map((us: any) => us.store);
            setStores(userStores);

            // Try to recover selected store from local storage
            const savedStoreId = localStorage.getItem('current_store_id');
            let initialStore = null;

            if (savedStoreId) {
                initialStore = userStores.find((s: Store) => s.id === savedStoreId);
            }

            // Default to first store if no saved selection or saved store not found in current list
            if (!initialStore && userStores.length > 0) {
                initialStore = userStores[0];
            }

            setCurrentStoreState(initialStore || null);
            if (initialStore) {
                localStorage.setItem('current_store_id', initialStore.id);
            }
        } else {
            setStores([]);
            setCurrentStoreState(null);
        }
        setIsLoading(false);
    }, [user]);

    const setCurrentStore = (store: Store) => {
        setCurrentStoreState(store);
        localStorage.setItem('current_store_id', store.id);
    };

    return (
        <StoreContext.Provider value={{ currentStore, setCurrentStore, stores, isLoading }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
}
