import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SyncGenericService } from './sync-generic.service';
import axios from 'axios';

@Injectable()
export class DesktopSyncService implements OnModuleInit {
    private readonly logger = new Logger(DesktopSyncService.name);
    private isSyncing = false;

    constructor(
        private prisma: PrismaService,
        private syncGeneric: SyncGenericService
    ) { }

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

    async syncWithRemote(isRetry = false) {
        if (this.isSyncing && !isRetry) return;
        
        const config = await this.prisma.desktopConfig.findFirst();
        if (!config || !config.remoteUrl || !config.syncToken || !config.autoSync) {
            return;
        }

        this.isSyncing = true;
        try {
            const baseUrl = config.remoteUrl.replace(/\/$/, '');
            const headers = { 
                Authorization: `Bearer ${config.syncToken}`,
                'x-client-id': config.clientId
            };

            // 1. PUSH local changes to remote
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
                } catch (pushError: any) {
                    if (pushError.response && (pushError.response.status === 401 || pushError.response.status === 403)) {
                        if (!isRetry && await this.handleReauthentication(config)) {
                            this.isSyncing = false;
                            return this.syncWithRemote(true);
                        }
                    }
                    this.logger.error(`Push failed: ${pushError.message}`);
                }
            }

            // 2. PULL remote changes
            const since = config.lastSyncAt ? config.lastSyncAt.toISOString() : new Date(0).toISOString();
            
            try {
                // If it's the very first time, we should call /initial to get the full DB dump instead.
                // But /initial is huge and complex. Let's stick to /pull for now, assuming the server
                // started tracking changes, OR if lastSyncAt is null, we can do a special sync.
                const pullUrl = config.lastSyncAt ? `${baseUrl}/sync/pull?since=${since}` : `${baseUrl}/sync/initial`;
                this.logger.log(`Pulling updates from ${pullUrl}...`);
                
                const pullRes = await axios.get(pullUrl, { headers });
                
                if (pullUrl.includes('/initial')) {
                    // Handle initial full snapshot
                    const data = pullRes.data;
                    await this.applyInitialSnapshot(data);
                } else {
                    // Handle normal operations pull
                    const operations = pullRes.data.operations || [];
                    if (operations.length > 0) {
                        this.logger.log(`Applying ${operations.length} remote operations...`);
                        await this.syncGeneric.applyOperations(operations, 'SERVER'); // Applied as SERVER
                    }
                }

                // Update lastSyncAt
                await this.prisma.desktopConfig.update({
                    where: { id: config.id },
                    data: { lastSyncAt: new Date() }
                });

            } catch (pullError: any) {
                if (pullError.response && (pullError.response.status === 401 || pullError.response.status === 403)) {
                    if (!isRetry && await this.handleReauthentication(config)) {
                        this.isSyncing = false;
                        return this.syncWithRemote(true);
                    }
                }
                this.logger.error(`Pull failed: ${pullError.message}`);
            }

        } finally {
            this.isSyncing = false;
        }
    }

    private async applyInitialSnapshot(data: any) {
        // Here we just use createMany for all entities returned
        // This must be done inside syncContext to avoid re-recording
        const { syncContext } = require('../../common/prisma/prisma-sync.extension');
        
        await syncContext.run({ isApplyingSync: true }, async () => {
            try {
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
}
