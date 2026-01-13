import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from './db';
import { syncApi } from '@/services/api';

interface SyncContextType {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt: Date | null;
    pendingOperations: number;
    sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [pendingOperations, setPendingOperations] = useState(0);

    useEffect(() => {
        // Listen for online/offline events
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Count pending operations
        const updatePendingCount = async () => {
            const count = await db.operations.where('synced').equals(0).count();
            setPendingOperations(count);
        };

        updatePendingCount();
        const interval = setInterval(updatePendingCount, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const sync = async () => {
        if (!isOnline || isSyncing) return;

        setIsSyncing(true);
        try {
            // PUSH: Send pending operations
            const operations = await db.operations.where('synced').equals(0).toArray();

            if (operations.length > 0) {
                await syncApi.push(operations);

                // Mark as synced
                const ids = operations.map(op => op.id!);
                await db.operations.where('id').anyOf(ids).modify({ synced: 1 });
            }

            // PULL: Get updates from server
            const since = lastSyncAt?.toISOString() || new Date(0).toISOString();
            const serverData = await syncApi.pull(since);

            // Update local database with server data
            if (serverData) {
                // Sync products
                if (serverData.products) {
                    await db.products.bulkPut(serverData.products);
                }

                // Sync categories
                if (serverData.categories) {
                    await db.categories.bulkPut(serverData.categories);
                }

                // Sync customers
                if (serverData.customers) {
                    await db.customers.bulkPut(serverData.customers);
                }

                // Sync sales
                if (serverData.sales) {
                    await db.sales.bulkPut(serverData.sales);
                }

                // Sync stock movements
                if (serverData.stockMovements) {
                    await db.stockMovements.bulkPut(serverData.stockMovements);
                }

                // Sync subscription offers
                if (serverData.subscriptionOffers) {
                    await db.subscriptionOffers.bulkPut(serverData.subscriptionOffers);
                }

                // Sync customer subscriptions
                if (serverData.customerSubscriptions) {
                    await db.customerSubscriptions.bulkPut(serverData.customerSubscriptions);
                }

                // Sync subscription renewals
                if (serverData.subscriptionRenewals) {
                    await db.subscriptionRenewals.bulkPut(serverData.subscriptionRenewals);
                }

                // Sync subscription balance alerts
                if (serverData.subscriptionBalanceAlerts) {
                    await db.subscriptionBalanceAlerts.bulkPut(serverData.subscriptionBalanceAlerts);
                }
            }

            setLastSyncAt(new Date());
            setPendingOperations(0);
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-sync when coming online
    useEffect(() => {
        if (isOnline && pendingOperations > 0) {
            sync();
        }
    }, [isOnline]);

    return (
        <SyncContext.Provider
            value={{ isOnline, isSyncing, lastSyncAt, pendingOperations, sync }}
        >
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
}
