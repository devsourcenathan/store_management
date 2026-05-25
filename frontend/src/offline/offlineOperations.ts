import { db, OfflineOperation } from './db';
import { v4 as uuidv4 } from 'uuid';
import { isOfflineEnabled } from '@/lib/apiBaseUrl';

/**
 * Queue an operation for offline sync
 */
export async function queueOfflineOperation(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    data: any
): Promise<void> {
    const operation: OfflineOperation = {
        type,
        entity,
        data,
        clientId: uuidv4(),
        timestamp: Date.now(),
        synced: 0,
    };

    await db.operations.add(operation);
}

/**
 * Save data locally and queue for sync
 */
export async function saveOffline<T extends Record<string, any>>(
    entity: string,
    data: T,
    isUpdate: boolean = false
): Promise<T & { id: string }> {
    // Generate ID if creating new entity
    const dataWithId = data as T & { id?: string };
    if (!dataWithId.id) {
        dataWithId.id = uuidv4();
    }

    // Save to local database
    const table = getTableForEntity(entity);
    if (table) {
        await table.put(dataWithId);
    }

    // Queue for sync
    await queueOfflineOperation(
        isUpdate ? 'UPDATE' : 'CREATE',
        entity,
        dataWithId
    );

    return dataWithId as T & { id: string };
}

/**
 * Delete data locally and queue for sync
 */
export async function deleteOffline(
    entity: string,
    id: string
): Promise<void> {
    // Delete from local database
    const table = getTableForEntity(entity);
    if (table) {
        await table.delete(id);
    }

    // Queue for sync
    await queueOfflineOperation('DELETE', entity, { id });
}

/**
 * Extract entity name from API URL
 */
export function extractEntityFromUrl(url: string): string {
    // Remove leading slash and query parameters
    const cleanUrl = url.replace(/^\//, '').split('?')[0];

    // Split by slash and get the first segment
    const segments = cleanUrl.split('/');
    const firstSegment = segments[0];

    // Handle special cases
    if (firstSegment === 'stock' && segments[1] === 'movements') {
        return 'stockMovements';
    }

    // Return the first segment as entity name
    return firstSegment;
}

/**
 * Get the IndexedDB table for an entity
 */
export function getTableForEntity(entity: string): any {
    const tableMap: Record<string, any> = {
        'products': db.products,
        'categories': db.categories,
        'customers': db.customers,
        'suppliers': db.suppliers,
        'stores': db.storesTable,
        'sales': db.sales,
        'stockMovements': db.stockMovements,
        'services': db.services,
        'subscriptionOffers': db.subscriptionOffers,
        'subscriptionRenewals': db.subscriptionRenewals,
        'subscriptionBalanceEntries': db.subscriptionBalanceEntries,
        'customerSubscriptions': db.customerSubscriptions,
    };

    return tableMap[entity];
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
    if (!isOfflineEnabled()) return true;
    return navigator.onLine;
}

/**
 * Wrapper for API calls with offline fallback
 */
export async function withOfflineFallback<T>(
    apiCall: () => Promise<T>,
    offlineFallback: () => Promise<T>
): Promise<T> {
    if (!isOfflineEnabled()) {
        return apiCall();
    }

    if (!isOnline()) {
        return offlineFallback();
    }

    try {
        return await apiCall();
    } catch (error: any) {
        if (error.message?.includes('Network') || error.code === 'ERR_NETWORK') {
            return offlineFallback();
        }
        throw error;
    }
}
