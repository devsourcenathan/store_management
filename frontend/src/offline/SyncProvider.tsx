import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { db } from './db';
import { syncApi } from '@/services/api';
import { toast } from 'sonner';

interface SyncContextType {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt: Date | null;
    pendingOperations: number;
    syncError: string | null;
    sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const AUTO_SYNC_INTERVAL_MS = 60000; // 1 minute

export function SyncProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(() => {
        const stored = localStorage.getItem('lastSyncAt');
        return stored ? new Date(stored) : null;
    });
    const [pendingOperations, setPendingOperations] = useState(0);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // Update pending operations count
    const updatePendingCount = useCallback(async () => {
        try {
            const count = await db.operations.where('synced').equals(0).count();
            setPendingOperations(count);
        } catch (error) {
            console.error('Failed to count pending operations:', error);
        }
    }, []);

    useEffect(() => {
        // Listen for online/offline events
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Connection restored');
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('You are now offline. Changes will be saved locally.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial count and periodic updates
        updatePendingCount();
        const countInterval = setInterval(updatePendingCount, 5000);

        // Auto-sync interval when online
        const syncInterval = setInterval(() => {
            if (isOnline && !isSyncing && pendingOperations > 0) {
                sync();
            }
        }, AUTO_SYNC_INTERVAL_MS);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(countInterval);
            clearInterval(syncInterval);
        };
    }, [isOnline, isSyncing, pendingOperations]);

    const sync = useCallback(async () => {
        if (!isOnline || isSyncing) return;

        setIsSyncing(true);
        setSyncError(null);

        try {
            // PUSH: Send pending operations
            const operations = await db.operations.where('synced').equals(0).toArray();

            if (operations.length > 0) {
                console.log(`Syncing ${operations.length} pending operations...`);

                try {
                    const result = await syncApi.push(operations);

                    // Mark successful operations as synced
                    if (result.success && result.success.length > 0) {
                        const successIds = operations
                            .filter(op => result.success.some((s: any) => s.clientId === op.clientId))
                            .map(op => op.id!)
                            .filter(id => id !== undefined);

                        if (successIds.length > 0) {
                            await db.operations.where('id').anyOf(successIds).modify({ synced: 1 });
                        }
                    }

                    // Log errors but don't fail the entire sync
                    if (result.errors && result.errors.length > 0) {
                        console.error('Some operations failed to sync:', result.errors);
                        toast.error(`${result.errors.length} operation(s) failed to sync`);
                    }
                } catch (pushError: any) {
                    console.error('Push failed:', pushError);

                    // Retry logic with exponential backoff
                    if (retryCount < MAX_RETRY_ATTEMPTS) {
                        setRetryCount(prev => prev + 1);
                        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
                        toast.warning(`Sync failed. Retrying in ${delay / 1000}s...`);

                        setTimeout(() => {
                            sync();
                        }, delay);
                        return;
                    } else {
                        throw pushError;
                    }
                }
            }

            // PULL: Get updates from server
            const since = lastSyncAt?.toISOString() || new Date(0).toISOString();

            try {
                const serverData = await syncApi.pull(since);

                // Update local database with server data
                if (serverData) {
                    const updates = [];

                    if (serverData.products?.length > 0) {
                        updates.push(db.products.bulkPut(serverData.products));
                    }
                    if (serverData.categories?.length > 0) {
                        updates.push(db.categories.bulkPut(serverData.categories));
                    }
                    if (serverData.customers?.length > 0) {
                        updates.push(db.customers.bulkPut(serverData.customers));
                    }
                    if (serverData.suppliers?.length > 0) {
                        updates.push(db.suppliers.bulkPut(serverData.suppliers));
                    }
                    if (serverData.stores?.length > 0) {
                        updates.push(db.storesTable.bulkPut(serverData.stores));
                    }
                    if (serverData.services?.length > 0) {
                        updates.push(db.services.bulkPut(serverData.services));
                    }
                    if (serverData.subscriptionOffers?.length > 0) {
                        updates.push(db.subscriptionOffers.bulkPut(serverData.subscriptionOffers));
                    }

                    await Promise.all(updates);
                }
            } catch (pullError) {
                console.error('Pull failed:', pullError);
                // Don't fail the entire sync if pull fails
                toast.warning('Failed to fetch latest updates from server');
            }

            // Success
            const now = new Date();
            setLastSyncAt(now);
            localStorage.setItem('lastSyncAt', now.toISOString());
            setRetryCount(0);
            await updatePendingCount();

            if (operations.length > 0) {
                toast.success('All changes synced successfully');
            }
        } catch (error: any) {
            console.error('Sync failed:', error);
            setSyncError(error.message || 'Sync failed');
            toast.error('Sync failed. Will retry automatically.');
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing, lastSyncAt, retryCount, updatePendingCount]);

    // Auto-sync when coming online
    useEffect(() => {
        if (isOnline && pendingOperations > 0 && !isSyncing) {
            // Small delay to ensure connection is stable
            const timer = setTimeout(() => {
                sync();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    return (
        <SyncContext.Provider
            value={{ isOnline, isSyncing, lastSyncAt, pendingOperations, syncError, sync }}
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
