import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { syncContext, sanitizeSyncData } from '../../common/prisma/prisma-sync.extension';
import { DangerZoneService } from '../admin/danger-zone.service';

@Injectable()
export class SyncGenericService {
    private readonly logger = new Logger(SyncGenericService.name);

    constructor(
        private prisma: PrismaService,
        private dangerZoneService: DangerZoneService
    ) { }

    /**
     * Applies a batch of operations pushed by the desktop to the remote server,
     * or pulled from the remote server to the desktop.
     *
     * @param skipSameClient When true (pull on desktop), skip ops that originated from this client.
     *                       When false (push to cloud), always apply incoming ops.
     */
    async applyOperations(
        operations: any[],
        localClientId: string,
        options?: { skipSameClient?: boolean },
    ) {
        const skipSameClient = options?.skipSameClient ?? true;
        const results = {
            success: [] as any[],
            errors: [] as any[],
        };

        const ENTITY_ORDER = [
            'Organization', 'PlatformPlan', 'OrganizationSubscription', 'BillingInvoice',
            'Store', 'User', 'UserStore', 'RolePermission', 'UserPermission', 'Permission',
            'Media', 'Category', 'Product', 'ProductImage', 'DeletedProduct', 'PricingRule',
            'StockMovement', 'StockAlert', 'Customer', 'Supplier',
            'Service', 'SubscriptionOffer', 'SubscriptionOption',
            'CustomerSubscription', 'SubscriptionAccount', 'SubscriptionBalanceEntry',
            'SubscriptionRenewal', 'SubscriptionBalanceAlert',
            'Sale', 'SaleItem', 'CreditContract', 'CreditPayment', 'Payment',
            'Supply', 'SupplyItem', 'SupplierBalanceEntry',
            'Device', 'Maintenance', 'MaintenancePart', 'MaintenanceInvoice',
            'LandingContent', 'OrganizationLanding', 'AuditLog', 'SyncMetadata', 'SyncOperation', 'DesktopConfig'
        ];

        // Sort operations by timestamp, then by entity dependency, then by ID
        const sortedOps = [...operations].sort((a, b) => {
            const timeA = a.timestamp || new Date(a.createdAt).getTime();
            const timeB = b.timestamp || new Date(b.createdAt).getTime();
            if (timeA !== timeB) return timeA - timeB;
            
            const indexA = ENTITY_ORDER.indexOf(a.entity);
            const indexB = ENTITY_ORDER.indexOf(b.entity);
            
            if (indexA !== -1 && indexB !== -1) {
                if (indexA !== indexB) return indexA - indexB;
            } else if (indexA !== -1) {
                return -1; // a is recognized, b is not. a comes first.
            } else if (indexB !== -1) {
                return 1; // b is recognized, a is not. b comes first.
            }

            return a.id.localeCompare(b.id);
        });

        // We run the application inside the syncContext so the Prisma Extension DOES NOT re-log these operations
        await syncContext.run({ isApplyingSync: true }, async () => {
            let pendingOps = [...sortedOps];
            let maxRetries = 3;
            
            while (pendingOps.length > 0 && maxRetries > 0) {
                const retryOps = [];
                for (const op of pendingOps) {
                    try {
                        // On pull: ignore our own operations echoed back from the remote log.
                        if (skipSameClient && op.clientId === localClientId && localClientId !== 'SERVER') {
                            continue;
                        }

                        await this.processSingleOperation(op);
                        if (maxRetries === 3) results.success.push({ id: op.id });
                    } catch (error: any) {
                        if (error.message?.includes('Foreign key constraint') && maxRetries > 1) {
                            // Wait for other operations to create the missing foreign key
                            retryOps.push(op);
                        } else {
                            this.logger.error(`Failed to apply operation ${op.id} (${op.action} ${op.entity}): ${error.message}`, error.stack);
                            if (maxRetries === 1 || !error.message?.includes('Foreign key constraint')) {
                                results.errors.push({ id: op.id, entity: op.entity, action: op.action, error: error.message });
                            }
                        }
                    }
                }
                pendingOps = retryOps;
                maxRetries--;
            }
        });

        if (results.errors.length > 0) {
            require('fs').writeFileSync('sync-errors.log', JSON.stringify(results.errors, null, 2));
        }
        return results;
    }

    private async processSingleOperation(op: any) {
        const entity = op.entity;
        const action = op.action || op.type; // support both
        const data = op.data;
        const timestamp = op.createdAt ? new Date(op.createdAt).getTime() : op.timestamp;
        
        let parsedData = data;
        if (typeof data === 'string') {
            try {
                parsedData = JSON.parse(data);
            } catch (e) {}
        }

        if (entity === 'SystemAction' && action === 'RESET_MODULE') {
            const { target, organizationId } = parsedData as any;
            if (target && organizationId) {
                // Pass a specific clientId to prevent loop (we don't want the sync apply to generate another sync op)
                await this.dangerZoneService.resetModule(organizationId, target, 'SERVER_SYNC_APPLY');
            }
            return;
        }

        // Lowercase the first letter to match Prisma's model property names
        const modelName = entity.charAt(0).toLowerCase() + entity.slice(1);
        const model = (this.prisma as any)[modelName] as any;

        if (!model) {
            throw new Error(`Model ${entity} not found in Prisma Client`);
        }

        const recordData = sanitizeSyncData(parsedData) as Record<string, unknown>;
        
        // Ensure required JSON fields for SQLite compatibility
        if (entity === 'Media' && recordData.tags === undefined) {
            recordData.tags = [];
        }
        if (entity === 'PricingRule' && recordData.rules === undefined) {
            recordData.rules = {};
        }

        const recordId = recordData.id as string | undefined;
        if (!recordId) {
            throw new Error(`Operation ${op.id} is missing record id`);
        }

        try {
            // Handle Last-Write-Wins
            if (action === 'CREATE' || action === 'UPDATE') {
                const existingRecord = await model.findUnique({ where: { id: recordId } });
                
                if (existingRecord) {
                    // If the local record is newer, we ignore the incoming operation
                    // We use updatedAt if it exists, otherwise we fallback to the operation's timestamp vs record's createdAt
                    const localTime = existingRecord.updatedAt ? new Date(existingRecord.updatedAt).getTime() : new Date(existingRecord.createdAt || 0).getTime();
                    const incomingTime = timestamp;

                    if (localTime > incomingTime) {
                        this.logger.debug(`[Sync] Conflict resolved: Local ${entity} ${recordId} is newer. Dropping incoming ${action}.`);
                        return; // Ignore
                    }

                    await model.update({
                        where: { id: recordId },
                        data: recordData,
                    });
                } else {
                    // Doesn't exist locally, we create it
                    if (action === 'DELETE') return; // Cannot delete what doesn't exist

                    await model.create({
                        data: recordData,
                    });
                }
            } else if (action === 'DELETE') {
                const existingRecord = await model.findUnique({ where: { id: recordId } });
                if (existingRecord) {
                    // We could check timestamp, but a delete usually wins.
                    await model.delete({ where: { id: recordId } });
                }
            }
        } catch (error: any) {
            if (error.message && error.message.includes('Foreign key constraint violated')) {
                this.logger.warn(`[Sync] Dropped operation for ${entity} ${recordId}: Dependency missing (likely deleted previously).`);
                return;
            }
            throw error;
        }
    }

    /**
     * Gets all operations logged on the server since a specific date,
     * excluding operations that originated from the requesting client.
     */
    async getOperationsSince(since: Date, clientId: string) {
        return this.prisma.syncOperation.findMany({
            where: {
                createdAt: { gt: since },
                clientId: { not: clientId },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Used ONLY for the very first time a desktop connects.
     * It fetches all data necessary to populate a blank SQLite DB.
     * We don't fetch literally everything generically because of complex relation filters,
     * so we fetch the key tables manually.
     */
    async getInitialSnapshot(organizationId: string) {
        // Fetch stores to get storeIds
        const stores = await this.prisma.store.findMany({ where: { organizationId } });
        const storeIds = stores.map((s: any) => s.id);

        const [
            organization,
            users,
            userStores,
            products,
            categories,
            customers,
            suppliers,
            services,
            sales,
            stockMovements,
            media,
            auditLogs,
            permissions,
            rolePermissions,
            userPermissions,
            supplies,
            supplierBalanceEntries,
            devices,
            maintenances,
            creditContracts,
            subscriptionOffers,
            customerSubscriptions,
            subscriptionAccounts,
            pricingRules,
            stockAlerts,
            deletedProducts
        ] = await Promise.all([
            this.prisma.organization.findUnique({ where: { id: organizationId } }),
            this.prisma.user.findMany({ where: { organizationId } }),
            this.prisma.userStore.findMany({ where: { user: { organizationId } } }),
            this.prisma.product.findMany({ where: { organizationId }, include: { images: true } }),
            this.prisma.category.findMany({ where: { organizationId } }),
            this.prisma.customer.findMany({ where: { organizationId } }),
            this.prisma.supplier.findMany({ where: { organizationId } }),
            this.prisma.service.findMany({ where: { organizationId } }),
            this.prisma.sale.findMany({ where: { storeId: { in: storeIds } }, include: { items: true, payments: true } }),
            this.prisma.stockMovement.findMany({ where: { storeId: { in: storeIds } } }),
            this.prisma.media.findMany({ where: { organizationId } }),
            this.prisma.auditLog.findMany({ where: { organizationId }, take: 2000, orderBy: { createdAt: 'desc' } }),
            this.prisma.permission.findMany(),
            this.prisma.rolePermission.findMany({ where: { organizationId } }),
            this.prisma.userPermission.findMany({ where: { user: { organizationId } } }),
            this.prisma.supply.findMany({ where: { supplier: { organizationId } }, include: { items: true } }),
            this.prisma.supplierBalanceEntry.findMany({ where: { supplier: { organizationId } } }),
            this.prisma.device.findMany({ where: { organizationId } }),
            this.prisma.maintenance.findMany({ where: { organizationId }, include: { parts: true, invoice: true } }),
            this.prisma.creditContract.findMany({ where: { sale: { storeId: { in: storeIds } } }, include: { payments: true } }),
            this.prisma.subscriptionOffer.findMany({ where: { service: { organizationId } }, include: { options: true } }),
            this.prisma.customerSubscription.findMany({ where: { customer: { organizationId } }, include: { options: true, renewals: true } }),
            this.prisma.subscriptionAccount.findMany({ where: { service: { organizationId } }, include: { balanceEntries: true, alerts: true } }),
            this.prisma.pricingRule.findMany({ where: { product: { organizationId } } }),
            this.prisma.stockAlert.findMany({ where: { storeId: { in: storeIds } } }),
            this.prisma.deletedProduct.findMany({ where: { storeId: { in: storeIds } } })
        ]);

        return {
            organization,
            stores,
            users,
            userStores,
            products,
            categories,
            customers,
            suppliers,
            services,
            sales,
            stockMovements,
            media,
            auditLogs,
            permissions,
            rolePermissions,
            userPermissions,
            supplies,
            supplierBalanceEntries,
            devices,
            maintenances,
            creditContracts,
            subscriptionOffers,
            customerSubscriptions,
            subscriptionAccounts,
            pricingRules,
            stockAlerts,
            deletedProducts,
            timestamp: new Date().toISOString(),
        };
    }
}

