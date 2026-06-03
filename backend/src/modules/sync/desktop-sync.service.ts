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

    async syncWithRemote() {
        if (this.isSyncing) return;
        
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
                
                for (const s of data.sales || []) {
                    const { items, payments, ...saleData } = s;
                    await this.prisma.sale.upsert({ where: { id: s.id }, update: saleData, create: saleData });
                    await upsertMany('saleItem', items);
                    await upsertMany('payment', payments);
                }
                
                await upsertMany('stockMovement', data.stockMovements);
                
                this.logger.log('Initial snapshot applied successfully.');
            } catch (error: any) {
                this.logger.error(`Failed to apply initial snapshot: ${error.message}`, error.stack);
            }
        });
    }
}
