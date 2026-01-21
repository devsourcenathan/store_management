import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface OfflineOperation {
    id?: number;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    data: any;
    clientId: string;
    timestamp: number;
}

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(private prisma: PrismaService) { }

    async processOperations(operations: OfflineOperation[], userId: string, organizationId: string) {
        const results = {
            success: [],
            errors: [],
        };

        // Sort operations by timestamp to maintain order
        const sortedOps = operations.sort((a, b) => a.timestamp - b.timestamp);

        for (const op of sortedOps) {
            try {
                await this.processOperation(op, userId, organizationId);
                results.success.push({
                    clientId: op.clientId,
                    entity: op.entity,
                    type: op.type,
                });
            } catch (error) {
                this.logger.error(`Failed to process operation: ${error.message}`, error.stack);
                results.errors.push({
                    clientId: op.clientId,
                    entity: op.entity,
                    type: op.type,
                    error: error.message,
                });
            }
        }

        return results;
    }

    private async processOperation(op: OfflineOperation, userId: string, organizationId: string) {
        const { entity, type, data } = op;

        // Map entity names to Prisma models
        const entityMap = {
            'products': 'product',
            'categories': 'category',
            'stockMovements': 'stockMovement',
            'sales': 'sale',
            'customers': 'customer',
            'suppliers': 'supplier',
            'stores': 'store',
            'services': 'service',
            'subscriptionOffers': 'subscriptionOffer',
            'subscriptionRenewals': 'subscriptionRenewal',
            'subscriptionBalanceEntries': 'subscriptionBalanceEntry',
            'users': 'user',
        };

        if (entity === 'sync') {
            return; // Ignore sync metadata operations
        }

        const modelName = entityMap[entity];
        if (!modelName) {
            throw new Error(`Unknown entity: ${entity}`);
        }

        const model: any = this.prisma[modelName];
        if (!model) {
            throw new Error(`Model not found: ${modelName}`);
        }

        // Add metadata
        const enrichedData = {
            ...data,
            organizationId,
        };

        // Sanitize generic fields that shouldn't be persisted directly to the model
        if (data.initialStock !== undefined) {
            delete enrichedData.initialStock;
        }

        // Sanitize model-specific fields
        if (entity === 'products') {
            delete enrichedData.storeId;
        }

        switch (type) {
            case 'CREATE':
                // Check if already exists (idempotency)
                if (data.id) {
                    const existing = await model.findUnique({ where: { id: data.id } });
                    if (existing) {
                        this.logger.warn(`Entity ${entity}:${data.id} already exists, skipping create`);
                        return existing;
                    }
                }
                return await model.create({ data: enrichedData });

            case 'UPDATE':
                return await model.update({
                    where: { id: data.id },
                    data: enrichedData,
                });

            case 'DELETE':
                return await model.delete({
                    where: { id: data.id },
                });

            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    }

    async getUpdates(since: string, organizationId: string) {
        const sinceDate = new Date(since);

        // Fetch all updated entities since the given timestamp
        const [
            products,
            categories,
            customers,
            suppliers,
            stores,
            services,
            subscriptionOffers,
        ] = await Promise.all([
            this.prisma.product.findMany({
                where: {
                    organizationId,
                    updatedAt: { gte: sinceDate },
                },
                include: {
                    images: true,
                },
            }),
            this.prisma.category.findMany({
                where: {
                    organizationId,
                    updatedAt: { gte: sinceDate },
                },
            }),
            this.prisma.customer.findMany({
                where: {
                    organizationId,
                    updatedAt: { gte: sinceDate },
                },
            }),
            this.prisma.supplier.findMany({
                where: {
                    organizationId,
                    updatedAt: { gte: sinceDate },
                },
            }),
            this.prisma.store.findMany({
                where: {
                    organizationId,
                    updatedAt: { gte: sinceDate },
                },
            }),
            this.prisma.service.findMany({
                where: {
                    organizationId,
                    updatedAt: { gte: sinceDate },
                },
            }),
            this.prisma.subscriptionOffer.findMany({
                where: {
                    service: {
                        organizationId,
                    },
                    updatedAt: { gte: sinceDate },
                },
            }),
        ]);

        return {
            products,
            categories,
            customers,
            suppliers,
            stores,
            services,
            subscriptionOffers,
            timestamp: new Date().toISOString(),
        };
    }
}
