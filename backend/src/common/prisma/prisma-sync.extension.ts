import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AsyncLocalStorage } from 'async_hooks';

// We use ALS to know if we are currently inside a "sync pull" operation
// If so, we bypass logging to avoid infinite loops
export const syncContext = new AsyncLocalStorage<{ isApplyingSync: boolean }>();

/** Strip nested relations before persisting sync payloads (e.g. product.category). */
export function sanitizeSyncData(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
            result[key] = value;
            continue;
        }
        if (value instanceof Date) {
            result[key] = value;
            continue;
        }
        if (value instanceof Decimal) {
            result[key] = value.toString();
            continue;
        }
        // Prisma Decimal duck-type (e.g. after JSON round-trip in tests)
        if (
            typeof value === 'object' &&
            value !== null &&
            'toJSON' in value &&
            typeof (value as { toJSON: unknown }).toJSON === 'function' &&
            'd' in value &&
            'e' in value &&
            's' in value
        ) {
            result[key] = (value as { toJSON: () => string }).toJSON();
            continue;
        }
        if (Array.isArray(value) || typeof value === 'object') {
            continue;
        }
        result[key] = value;
    }
    return result;
}

const SYNC_IGNORE_MODELS = [
    'SyncOperation',
    'DesktopConfig',
    'AuditLog',
    'SyncMetadata',
];

export function withSyncExtension(client: any) {
    return client.$extends({
        query: {
            $allModels: {
                async create({ model, args, query }: any) {
                    const result = await query(args);
                    scheduleRecordSyncOperation(client, model, 'CREATE', result);
                    return result;
                },
                async update({ model, args, query }: any) {
                    const result = await query(args);
                    scheduleRecordSyncOperation(client, model, 'UPDATE', result);
                    return result;
                },
                async delete({ model, args, query }: any) {
                    const result = await query(args);
                    scheduleRecordSyncOperation(client, model, 'DELETE', result);
                    return result;
                },
                async upsert({ model, args, query }: any) {
                    const result = await query(args);
                    scheduleRecordSyncOperation(client, model, 'UPDATE', result);
                    return result;
                },
                // We should also handle createMany, updateMany, deleteMany if possible,
                // but since they don't return the full rows natively, it's safer to avoid them
                // in business logic or handle them specifically. We log a warning if used.
                async createMany({ model, args, query }: any) {
                    console.warn(`[Sync] createMany used on ${model}. This may not be synced correctly if not handled.`);
                    return query(args);
                },
                async updateMany({ model, args, query }: any) {
                    console.warn(`[Sync] updateMany used on ${model}. This may not be synced correctly if not handled.`);
                    return query(args);
                },
                async deleteMany({ model, args, query }: any) {
                    console.warn(`[Sync] deleteMany used on ${model}. This may not be synced correctly if not handled.`);
                    return query(args);
                }
            }
        }
    });
}

async function resolveSyncClientId(client: any): Promise<string> {
    const isDesktop = process.env.LOCAL_BUNDLE === 'true';
    if (!isDesktop) {
        return 'SERVER';
    }

    const config = await client.desktopConfig.findFirst();
    return config?.clientId || 'DESKTOP_UNCONFIGURED';
}

/** Persist a sync operation (usable from backfill / deferred logging). */
export async function persistSyncOperation(
    client: any,
    entity: string,
    action: string,
    data: any,
    clientId?: string,
) {
    const sanitized = sanitizeSyncData(data);
    const resolvedClientId = clientId ?? await resolveSyncClientId(client);

    await client.syncOperation.create({
        data: {
            action,
            entity,
            entityId: data.id,
            data: JSON.stringify(sanitized),
            clientId: resolvedClientId,
            synced: false,
        },
    });
}

/**
 * Queue sync logging after the current Prisma interactive transaction commits.
 * Writing sync_operations inside a transaction hook deadlocks SQLite (P1008).
 */
function scheduleRecordSyncOperation(client: any, entity: string, action: string, data: any) {
    if (SYNC_IGNORE_MODELS.includes(entity)) {
        return;
    }

    const context = syncContext.getStore();
    if (context?.isApplyingSync) {
        return;
    }

    if (!data || !data.id) {
        console.warn(`[Sync] Entity ${entity} has no ID, skipping sync log.`);
        return;
    }

    setImmediate(() => {
        void persistSyncOperation(client, entity, action, data).catch((error) => {
            console.error(`[Sync] Failed to record sync operation for ${entity} ${action}:`, error);
        });
    });
}
