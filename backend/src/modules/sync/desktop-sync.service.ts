import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { persistSyncOperation } from '../../common/prisma/prisma-sync.extension';
import { SyncGenericService } from './sync-generic.service';
import { LocalStorageService } from '../media/local-storage.service';
import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class DesktopSyncService implements OnModuleInit {
    private readonly logger = new Logger(DesktopSyncService.name);
    private isSyncing = false;

    constructor(
        private prisma: PrismaService,
        private syncGeneric: SyncGenericService,
        private localStorage: LocalStorageService
    ) { }

    getIsSyncing(): boolean {
        return this.isSyncing;
    }

    async getSyncStatus() {
        const config = await this.prisma.desktopConfig.findFirst();
        const isConfigured = !!(config?.remoteUrl && config?.syncToken);
        const pendingOperations = isConfigured
            ? await this.prisma.syncOperation.count({ where: { synced: false } })
            : 0;

        return {
            isConfigured,
            isSyncing: this.isSyncing,
            lastSyncAt: config?.lastSyncAt ?? null,
            pendingOperations,
            autoSync: config?.autoSync ?? false,
        };
    }

    onModuleInit() {
        if (process.env.LOCAL_BUNDLE === 'true') {
            // Run sync every minute
            setInterval(() => {
                this.syncWithRemote().catch(e => this.logger.error('Background sync error', e));
            }, 60000);

            // Initial immediate sync after a delay
            setTimeout(() => {
                this.syncWithRemote().catch(e => this.logger.error('Initial background sync error', e));
            }, 10000);
        }
    }

    async syncWithRemote(isRetry = false, force = false): Promise<{ success: boolean; message?: string; lastSyncAt?: Date }> {
        if (this.isSyncing && !isRetry) {
            return { success: false, message: 'Sync already in progress' };
        }

        const config = await this.prisma.desktopConfig.findFirst();
        if (!config || !config.remoteUrl || !config.syncToken) {
            return { success: false, message: 'Sync not configured' };
        }
        if (!force && !config.autoSync) {
            return { success: false, message: 'Auto sync is disabled' };
        }

        this.isSyncing = true;
        let lastSyncAt: Date | undefined;
        let pullApplyErrors = 0;
        let pushPendingRemaining = 0;
        try {
            const baseUrl = config.remoteUrl.replace(/\/$/, '');
            const headers = { 
                Authorization: `Bearer ${config.syncToken}`,
                'x-client-id': config.clientId
            };

            // 0. Upload local-only media files to the cloud BEFORE pushing sync ops
            await this.uploadLocalMediaToCloud(config, headers);

            // 1. PUSH local changes to remote
            await this.pruneStalePendingOperations();
            await this.backfillMissingLocalProducts(config, headers);

            const pendingOps = await this.prisma.syncOperation.findMany({
                where: { synced: false },
                orderBy: { createdAt: 'asc' }
            });

            if (pendingOps.length > 0) {
                this.logger.log(`Pushing ${pendingOps.length} operations to remote...`);
                try {
                    const pushRes = await axios.post(`${baseUrl}/sync/push`, {
                        operations: pendingOps.map(op => ({
                            id: op.id,
                            type: op.action,
                            action: op.action,
                            entity: op.entity,
                            data: typeof op.data === 'string' ? JSON.parse(op.data) : op.data,
                            clientId: config.clientId,
                            createdAt: op.createdAt.toISOString()
                        }))
                    }, { headers });

                    if (pushRes.data?.success?.length > 0) {
                        const successIds = pushRes.data.success.map((s: any) => s.id);
                        await this.prisma.syncOperation.updateMany({
                            where: { id: { in: successIds } },
                            data: { synced: true }
                        });
                        this.logger.log(`Successfully pushed ${successIds.length} operations.`);
                    }
                    if (pushRes.data?.errors?.length > 0) {
                        this.logger.error(
                            `Push rejected ${pushRes.data.errors.length}/${pendingOps.length} operations`,
                            pushRes.data.errors,
                        );
                    }
                    const pushedCount = pushRes.data?.success?.length ?? 0;
                    const errorCount = pushRes.data?.errors?.length ?? 0;
                    pushPendingRemaining = pendingOps.length - pushedCount;
                    if (pushedCount === 0 && pendingOps.length > 0 && errorCount === 0) {
                        this.logger.error(
                            `Push returned 0 applied operations for ${pendingOps.length} pending — cloud server may need an update`,
                        );
                    }
                } catch (pushError: any) {
                    pushPendingRemaining = pendingOps.length;
                    if (pushError.response && (pushError.response.status === 401 || pushError.response.status === 403)) {
                        if (!isRetry && await this.handleReauthentication(config)) {
                            this.isSyncing = false;
                            return this.syncWithRemote(true, force);
                        }
                    }
                    this.logger.error(`Push failed: ${pushError.message}`);
                }
            }

            // 2. PULL remote changes (7d overlap to recover missed ops from prior failed applies)
            const PULL_OVERLAP_MS = 7 * 24 * 60 * 60 * 1000;
            const sinceDate = config.lastSyncAt
                ? new Date(Math.max(0, config.lastSyncAt.getTime() - PULL_OVERLAP_MS))
                : new Date(0);
            const since = sinceDate.toISOString();

            try {
                // If it's the very first time, we should call /initial to get the full DB dump instead.
                // But /initial is huge and complex. Let's stick to /pull for now, assuming the server
                // started tracking changes, OR if lastSyncAt is null, we can do a special sync.
                const pullUrl = config.lastSyncAt ? `${baseUrl}/sync/pull?since=${since}` : `${baseUrl}/sync/initial`;
                this.logger.log(`Pulling updates from ${pullUrl}...`);
                
                const pullRes = await axios.get(pullUrl, { headers });
                
                if (pullUrl.includes('/initial')) {
                    const data = pullRes.data;
                    await this.applyInitialSnapshot(data);
                    lastSyncAt = new Date();
                    await this.prisma.desktopConfig.update({
                        where: { id: config.id },
                        data: { lastSyncAt },
                    });
                    // Pre-download all remote media files for offline use
                    this.downloadRemoteMediaToLocal().catch(e => this.logger.error('Background media download failed', e.message));
                } else {
                    // Handle normal operations pull
                    const operations = pullRes.data.operations || [];
                    if (operations.length > 0) {
                        this.logger.log(`Applying ${operations.length} remote operations...`);
                        const applyResult = await this.syncGeneric.applyOperations(operations, config.clientId);

                        if (applyResult.errors.length > 0) {
                            pullApplyErrors = applyResult.errors.length;
                            this.logger.error(
                                `Failed to apply ${applyResult.errors.length}/${operations.length} remote operations`,
                                applyResult.errors,
                            );
                        }

                        // Always update lastSyncAt so we don't get stuck in an infinite loop
                        // pulling the same poisoned/irrelevant operations.
                        lastSyncAt = new Date(pullRes.data.timestamp || new Date());
                        await this.prisma.desktopConfig.update({
                            where: { id: config.id },
                            data: { lastSyncAt },
                        });
                        // Pre-download any new remote media files for offline use
                        this.downloadRemoteMediaToLocal().catch(e => this.logger.error('Background media download failed', e.message));
                    } else {
                        lastSyncAt = new Date();
                        await this.prisma.desktopConfig.update({
                            where: { id: config.id },
                            data: { lastSyncAt },
                        });
                    }
                }

            } catch (pullError: any) {
                if (pullError.response && (pullError.response.status === 401 || pullError.response.status === 403)) {
                    if (!isRetry && await this.handleReauthentication(config)) {
                        this.isSyncing = false;
                        return this.syncWithRemote(true, force);
                    }
                }
                this.logger.error(`Pull failed: ${pullError.stack || pullError.message}`);
                return { success: false, message: `Erreur critique lors de la synchronisation: ${pullError.message}` };
            }
            if (pushPendingRemaining > 0) {
                return {
                    success: false,
                    message: `${pushPendingRemaining} local change(s) could not be pushed to the cloud. Update the cloud server and retry.`,
                    lastSyncAt,
                };
            }

            if (pullApplyErrors > 0) {
                return {
                    success: false,
                    message: `Failed to apply ${pullApplyErrors} remote change(s). Will retry on next sync.`,
                    lastSyncAt,
                };
            }

            return { success: true, lastSyncAt };
        } finally {
            this.isSyncing = false;
        }
    }

    /** Drop pending ops that can never succeed (deleted entities, test leftovers). */
    private async pruneStalePendingOperations() {
        const pending = await this.prisma.syncOperation.findMany({
            where: { synced: false },
            orderBy: { createdAt: 'asc' },
        });

        const staleIds: string[] = [];

        for (const op of pending) {
            const modelName = op.entity.charAt(0).toLowerCase() + op.entity.slice(1);
            const model = (this.prisma as any)[modelName] as any;
            if (!model) {
                continue;
            }

            if (op.action === 'CREATE') {
                const exists = await model.findUnique({ where: { id: op.entityId } });
                if (!exists) {
                    staleIds.push(op.id);
                }
            } else if (op.action === 'DELETE' || op.action === 'UPDATE') {
                const exists = await model.findUnique({ where: { id: op.entityId } });
                if (!exists) {
                    staleIds.push(op.id);
                }
            }
        }

        if (staleIds.length > 0) {
            await this.prisma.syncOperation.updateMany({
                where: { id: { in: staleIds } },
                data: { synced: true },
            });
            this.logger.log(`Pruned ${staleIds.length} stale pending sync operation(s)`);
        }
    }

    /**
     * Recover products created locally while sync logging failed (SQLite lock inside transactions).
     */
    private async backfillMissingLocalProducts(
        config: { clientId: string; remoteUrl: string },
        headers: Record<string, string>,
    ) {
        if (process.env.LOCAL_BUNDLE !== 'true') {
            return;
        }

        const baseUrl = config.remoteUrl.replace(/\/$/, '');
        try {
            const res = await axios.get(`${baseUrl}/products`, { headers });
            const remoteProducts: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
            const remoteIds = new Set(remoteProducts.map((p) => p.id));

            const localProducts = await this.prisma.product.findMany();
            let queued = 0;

            for (const product of localProducts) {
                if (remoteIds.has(product.id)) {
                    continue;
                }

                const alreadyQueued = await this.prisma.syncOperation.findFirst({
                    where: { entity: 'Product', entityId: product.id, synced: false },
                });
                if (alreadyQueued) {
                    continue;
                }

                await persistSyncOperation(this.prisma, 'Product', 'CREATE', product, config.clientId);
                queued++;
                this.logger.log(`Backfill: queued CREATE Product "${product.name}" (${product.id})`);
            }

            if (queued > 0) {
                this.logger.log(`Backfill: ${queued} local product(s) queued for cloud push`);
            }
        } catch (error: any) {
            this.logger.warn(`Product backfill skipped: ${error.message}`);
        }
    }

    private async applyInitialSnapshot(data: any) {
        // Here we just use createMany for all entities returned
        // This must be done inside syncContext to avoid re-recording
        const { syncContext } = require('../../common/prisma/prisma-sync.extension');
        
        await syncContext.run({ isApplyingSync: true }, async () => {
            try {
                // Clear seed data to prevent unique constraint violations (e.g. email, sku)
                await this.prisma.userStore.deleteMany({});
                await this.prisma.userPermission.deleteMany({});
                await this.prisma.rolePermission.deleteMany({});
                await this.prisma.user.deleteMany({});
                await this.prisma.product.deleteMany({});
                await this.prisma.store.deleteMany({});
                await this.prisma.organization.deleteMany({});

                if (data.organization) await this.prisma.organization.upsert({ where: { id: data.organization.id }, update: data.organization, create: data.organization });
                
                // Helper function for batch upsert
                const upsertMany = async (modelName: string, items: any[]) => {
                    if (!items || items.length === 0) return;
                    const model = (this.prisma as any)[modelName];
                    for (const item of items) {
                        await model.upsert({ where: { id: item.id }, update: item, create: item });
                    }
                };

                await upsertMany('user', data.users);
                await upsertMany('store', data.stores);
                
                // UserStores have composite keys (userId, storeId), upsertMany might fail without id.
                // Best to delete and recreate them to be safe.
                if (data.userStores && data.userStores.length > 0) {
                    await this.prisma.userStore.deleteMany({});
                    await this.prisma.userStore.createMany({ data: data.userStores });
                } else if (!data.userStores && data.users && data.stores) {
                    // Fallback if the remote API hasn't been updated yet to include userStores
                    const userStoresToCreate = [];
                    for (const u of data.users) {
                        for (const s of data.stores) {
                            userStoresToCreate.push({ userId: u.id, storeId: s.id });
                        }
                    }
                    await this.prisma.userStore.deleteMany({});
                    await this.prisma.userStore.createMany({ data: userStoresToCreate });
                }

                await upsertMany('category', data.categories);
                await upsertMany('permission', data.permissions);
                await upsertMany('rolePermission', data.rolePermissions);
                await upsertMany('userPermission', data.userPermissions);
                
                // Products have images, handle relations carefully if needed. Upsert might fail on complex relations.
                // For simplicity, we just use the raw table if possible or strip relations
                for (const p of data.products || []) {
                    const { images, ...productData } = p;
                    await this.prisma.product.upsert({ where: { id: p.id }, update: productData, create: productData });
                }

                await upsertMany('customer', data.customers);
                await upsertMany('supplier', data.suppliers);
                await upsertMany('service', data.services);
                
                const users = data.users || [];
                const userIds = new Set(users.map((u: any) => u.id));
                // Fallback user for corrupted data (e.g. sale created by a deleted or cross-org user)
                const fallbackUserId = users.find((u: any) => u.role === 'OWNER')?.id || (users.length > 0 ? users[0].id : null);

                for (const s of data.sales || []) {
                    const { items, payments, ...saleData } = s;
                    
                    // Fix missing creator foreign key constraint
                    if (saleData.createdBy && !userIds.has(saleData.createdBy)) {
                        this.logger.warn(`Sale ${s.id} references missing user ${saleData.createdBy}. Reassigning to ${fallbackUserId}.`);
                        saleData.createdBy = fallbackUserId;
                    }

                    // Fix missing customer foreign key constraint
                    if (saleData.customerId && !data.customers?.some((c: any) => c.id === saleData.customerId)) {
                        saleData.customerId = null;
                    }

                    if (!saleData.createdBy) {
                        this.logger.error(`Cannot insert sale ${s.id} without a creator.`);
                        continue;
                    }

                    await this.prisma.sale.upsert({ where: { id: s.id }, update: saleData, create: saleData });
                    await upsertMany('saleItem', items);
                    await upsertMany('payment', payments);
                }
                
                await upsertMany('stockMovement', data.stockMovements);
                await upsertMany('media', data.media);
                await upsertMany('auditLog', data.auditLogs);
                
                // Supplies
                for (const s of data.supplies || []) {
                    const { items, ...supplyData } = s;
                    await this.prisma.supply.upsert({ where: { id: s.id }, update: supplyData, create: supplyData });
                    await upsertMany('supplyItem', items);
                }
                await upsertMany('supplierBalanceEntry', data.supplierBalanceEntries);

                // SAV / Maintenance
                await upsertMany('device', data.devices);
                for (const m of data.maintenances || []) {
                    const { parts, invoice, ...maintenanceData } = m;
                    await this.prisma.maintenance.upsert({ where: { id: m.id }, update: maintenanceData, create: maintenanceData });
                    await upsertMany('maintenancePart', parts);
                    if (invoice) {
                        await this.prisma.maintenanceInvoice.upsert({ where: { id: invoice.id }, update: invoice, create: invoice });
                    }
                }

                // Credits
                for (const c of data.creditContracts || []) {
                    const { payments, ...contractData } = c;
                    await this.prisma.creditContract.upsert({ where: { id: c.id }, update: contractData, create: contractData });
                    await upsertMany('creditPayment', payments);
                }

                // Subscriptions
                for (const o of data.subscriptionOffers || []) {
                    const { options, ...offerData } = o;
                    await this.prisma.subscriptionOffer.upsert({ where: { id: o.id }, update: offerData, create: offerData });
                    await upsertMany('subscriptionOption', options);
                }
                for (const s of data.customerSubscriptions || []) {
                    const { options, renewals, ...subData } = s;
                    await this.prisma.customerSubscription.upsert({ 
                        where: { id: s.id }, 
                        update: { ...subData, options: { set: options?.map((o: any) => ({ id: o.id })) || [] } }, 
                        create: { ...subData, options: { connect: options?.map((o: any) => ({ id: o.id })) || [] } } 
                    });
                    await upsertMany('subscriptionRenewal', renewals);
                }
                for (const a of data.subscriptionAccounts || []) {
                    const { balanceEntries, alerts, ...accountData } = a;
                    await this.prisma.subscriptionAccount.upsert({ where: { id: a.id }, update: accountData, create: accountData });
                    await upsertMany('subscriptionBalanceEntry', balanceEntries);
                    await upsertMany('subscriptionBalanceAlert', alerts);
                }

                // Products specific
                await upsertMany('pricingRule', data.pricingRules);
                await upsertMany('stockAlert', data.stockAlerts);
                await upsertMany('deletedProduct', data.deletedProducts);

                this.logger.log('Initial snapshot applied successfully.');
            } catch (error: any) {
                this.logger.error(`Failed to apply initial snapshot: ${error.message}`, error.stack);
            }
        });
    }

    private async handleReauthentication(config: any): Promise<boolean> {
        if (!config.syncEmail || !config.syncPassword) {
            this.logger.error('Cannot auto-reauthenticate: credentials not saved');
            return false;
        }
        try {
            const baseUrl = config.remoteUrl.replace(/\/$/, '');
            this.logger.log('Attempting auto-reauthentication...');
            const res = await axios.post(`${baseUrl}/auth/login`, {
                email: config.syncEmail,
                password: config.syncPassword
            });
            if (res.data?.access_token) {
                await this.prisma.desktopConfig.update({
                    where: { id: config.id },
                    data: { syncToken: res.data.access_token }
                });
                this.logger.log('Auto-reauthentication successful.');
                return true;
            }
        } catch (err: any) {
            this.logger.error(`Auto-reauthentication failed: ${err.message}`);
        }
        return false;
    }

    /**
     * Upload local-only media files to the cloud before pushing sync operations.
     * This ensures that when a Media CREATE/UPDATE sync op is pushed, the cloud
     * already has the physical file and the URL in the op data points to S3.
     */
    private async uploadLocalMediaToCloud(config: any, headers: any) {
        try {
            // Find all media records with local-only URLs (i.e., /api/media/files/...)
            const localMedia = await this.prisma.media.findMany({
                where: {
                    url: { startsWith: '/api/media' },
                },
            });

            if (localMedia.length === 0) return;

            this.logger.log(`[MediaSync] Found ${localMedia.length} local media file(s) to upload to cloud...`);
            const baseUrl = config.remoteUrl.replace(/\/$/, '');

            for (const media of localMedia) {
                try {
                    const filepath = this.localStorage.getFilePath(
                        media.organizationId,
                        media.entityType,
                        media.filename,
                    );

                    if (!fs.existsSync(filepath)) {
                        this.logger.warn(`[MediaSync] Local file not found for media ${media.id}: ${filepath}`);
                        continue;
                    }

                    const fileBuffer = fs.readFileSync(filepath);
                    const formData = new FormData();
                    formData.append('file', fileBuffer, {
                        filename: media.originalName || media.filename,
                        contentType: media.mimeType || 'application/octet-stream',
                    });
                    formData.append('entityType', media.entityType);
                    formData.append('entityId', media.entityId);
                    formData.append('id', media.id);

                    // Clean up existing content-type to avoid conflicts with multipart/form-data
                    const safeHeaders = { ...headers };
                    delete safeHeaders['Content-Type'];
                    delete safeHeaders['content-type'];

                    const uploadRes = await axios.post(
                        `${baseUrl}/media/upload`,
                        formData,
                        {
                            headers: {
                                ...safeHeaders,
                                ...formData.getHeaders(),
                            },
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                        },
                    );

                    // The cloud returns a Media record with the S3 url
                    const remoteUrl = uploadRes.data?.url;
                    if (remoteUrl) {
                        // Replace local URL with remote URL in known tables
                        const { syncContext } = require('../../common/prisma/prisma-sync.extension');
                        await syncContext.run({ isApplyingSync: true }, async () => {
                            await this.prisma.media.update({
                                where: { id: media.id },
                                data: { url: remoteUrl },
                            });
                            await this.prisma.media.updateMany({
                                where: { thumbnailUrl: media.url },
                                data: { thumbnailUrl: remoteUrl },
                            });
                            await this.prisma.organization.updateMany({
                                where: { logoUrl: media.url },
                                data: { logoUrl: remoteUrl },
                            });
                            await this.prisma.store.updateMany({
                                where: { logoUrl: media.url },
                                data: { logoUrl: remoteUrl },
                            });
                            await this.prisma.productImage.updateMany({
                                where: { url: media.url },
                                data: { url: remoteUrl },
                            });
                        });
                        
                        // Replace the local URL in ALL pending sync operations' data payload
                        // This ensures that when the operation is pushed, it carries the remote URL
                        const pendingOps = await this.prisma.syncOperation.findMany({
                            where: { synced: false },
                        });
                        for (const op of pendingOps) {
                            let opDataStr = typeof op.data === 'string' ? op.data : JSON.stringify(op.data);
                            if (opDataStr.includes(media.url)) {
                                opDataStr = opDataStr.split(media.url).join(remoteUrl);
                                await this.prisma.syncOperation.update({
                                    where: { id: op.id },
                                    data: { data: JSON.parse(opDataStr) },
                                });
                            }
                        }

                        this.logger.log(`[MediaSync] Uploaded media ${media.id} to cloud: ${remoteUrl}`);
                    }
                } catch (err: any) {
                    this.logger.error(`[MediaSync] Failed to upload media ${media.id}: ${err.message}`);
                }
            }
        } catch (err: any) {
            this.logger.error(`[MediaSync] uploadLocalMediaToCloud error: ${err.message}`);
        }
    }

    /**
     * Download remote media files (S3 URLs) to local storage for offline access.
     * Runs in the background after a pull to pre-cache all images.
     */
    private async downloadRemoteMediaToLocal() {
        try {
            const allMedia = await this.prisma.media.findMany();
            let downloaded = 0;

            for (const media of allMedia) {
                // Skip media that already has a local URL or no remote URL
                if (!media.url || !media.url.startsWith('http')) continue;

                try {
                    const filepath = this.localStorage.getFilePath(
                        media.organizationId,
                        media.entityType,
                        media.filename,
                    );

                    // Skip if already cached locally
                    if (fs.existsSync(filepath)) continue;

                    const response = await axios.get(media.url, {
                        responseType: 'arraybuffer',
                        timeout: 30000,
                    });
                    await this.localStorage.save(
                        media.organizationId,
                        media.entityType,
                        media.filename,
                        Buffer.from(response.data),
                    );
                    downloaded++;
                } catch (err: any) {
                    this.logger.warn(`[MediaSync] Failed to download media ${media.id}: ${err.message}`);
                }
            }

            if (downloaded > 0) {
                this.logger.log(`[MediaSync] Downloaded ${downloaded} remote media file(s) to local cache.`);
            }
        } catch (err: any) {
            this.logger.error(`[MediaSync] downloadRemoteMediaToLocal error: ${err.message}`);
        }
    }
}
