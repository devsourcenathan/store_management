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
                    await recordSyncOperation(client, model, 'CREATE', result);
                    return result;
                },
                async update({ model, args, query }: any) {
                    const result = await query(args);
                    await recordSyncOperation(client, model, 'UPDATE', result);
                    return result;
                },
                async delete({ model, args, query }: any) {
                    const result = await query(args);
                    await recordSyncOperation(client, model, 'DELETE', result);
                    return result;
                },
                async upsert({ model, args, query }: any) {
                    const result = await query(args);
                    await recordSyncOperation(client, model, 'UPDATE', result);
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

async function recordSyncOperation(client: any, entity: string, action: string, data: any) {
    if (SYNC_IGNORE_MODELS.includes(entity)) {
        return;
    }

    const context = syncContext.getStore();
    if (context?.isApplyingSync) {
        // We are currently applying pulled changes from the remote server (or vice-versa),
        // so we DO NOT log this operation to avoid bouncing it back.
        return;
    }

    if (!data || !data.id) {
        console.warn(`[Sync] Entity ${entity} has no ID, skipping sync log.`);
        return;
    }

    try {
        // We determine the clientId based on whether we are on the desktop or the server
        const isDesktop = process.env.LOCAL_BUNDLE === 'true';
        let clientId = 'SERVER';

        if (isDesktop) {
            // Get desktop client ID from DB
            const config = await client.desktopConfig.findFirst();
            if (config?.clientId) {
                clientId = config.clientId;
            } else {
                clientId = 'DESKTOP_UNCONFIGURED';
            }
        }

        // We bypass the extension itself to write the log using an unextended client call
        // wait, client.syncOperation.create works even on an extended client because SyncOperation is ignored above.
        const sanitized = sanitizeSyncData(data);
        await client.syncOperation.create({
            data: {
                action,
                entity,
                entityId: data.id,
                data: JSON.stringify(sanitized),
                clientId,
                synced: false,
            }
        });
        
    } catch (error) {
        console.error(`[Sync] Failed to record sync operation for ${entity} ${action}:`, error);
    }
}
