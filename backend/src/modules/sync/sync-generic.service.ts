import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { syncContext } from '../../common/prisma/prisma-sync.extension';

@Injectable()
export class SyncGenericService {
    private readonly logger = new Logger(SyncGenericService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Applies a batch of operations pushed by the desktop to the remote server,
     * or pulled from the remote server to the desktop.
     */
    async applyOperations(operations: any[], localClientId: string) {
        const results = {
            success: [],
            errors: [],
        };

        // Sort operations by timestamp to maintain temporal order
        const sortedOps = [...operations].sort((a, b) => {
            const timeA = a.timestamp || new Date(a.createdAt).getTime();
            const timeB = b.timestamp || new Date(b.createdAt).getTime();
            return timeA - timeB;
        });

        // We run the application inside the syncContext so the Prisma Extension DOES NOT re-log these operations
        await syncContext.run({ isApplyingSync: true }, async () => {
            for (const op of sortedOps) {
                try {
                    // Ignore our own operations just in case
                    if (op.clientId === localClientId && localClientId !== 'SERVER') {
                        continue;
                    }

                    await this.processSingleOperation(op);
                    results.success.push({ id: op.id });
                } catch (error) {
                    this.logger.error(`Failed to apply operation ${op.id} (${op.action} ${op.entity}): ${error.message}`, error.stack);
                    results.errors.push({ id: op.id, error: error.message });
                }
            }
        });

        return results;
    }

    private async processSingleOperation(op: any) {
        const entity = op.entity;
        const action = op.action || op.type; // support both
        const data = op.data;
        const timestamp = op.createdAt ? new Date(op.createdAt).getTime() : op.timestamp;
        
        // Lowercase the first letter to match Prisma's model property names
        const modelName = entity.charAt(0).toLowerCase() + entity.slice(1);
        const model = (this.prisma as any)[modelName] as any;

        if (!model) {
            throw new Error(`Model ${entity} not found in Prisma Client`);
        }

        let parsedData = data;
        if (typeof data === 'string') {
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                // If it fails to parse, assume it's an object if Prisma returned it as such
            }
        }

        // Handle Last-Write-Wins
        if (action === 'CREATE' || action === 'UPDATE') {
            const existingRecord = await model.findUnique({ where: { id: parsedData.id } });
            
            if (existingRecord) {
                // If the local record is newer, we ignore the incoming operation
                // We use updatedAt if it exists, otherwise we fallback to the operation's timestamp vs record's createdAt
                const localTime = existingRecord.updatedAt ? new Date(existingRecord.updatedAt).getTime() : new Date(existingRecord.createdAt || 0).getTime();
                const incomingTime = timestamp;

                if (localTime > incomingTime) {
                    this.logger.debug(`[Sync] Conflict resolved: Local ${entity} ${parsedData.id} is newer. Dropping incoming ${action}.`);
                    return; // Ignore
                }

                // If it's newer, we update
                // We sanitize data just in case some relations are passed directly which Prisma update doesn't like unless formed correctly
                const { ...updateData } = parsedData;
                
                await model.update({
                    where: { id: parsedData.id },
                    data: updateData,
                });
            } else {
                // Doesn't exist locally, we create it
                if (action === 'DELETE') return; // Cannot delete what doesn't exist
                
                const { ...createData } = parsedData;
                await model.create({
                    data: createData,
                });
            }
        } else if (action === 'DELETE') {
            const existingRecord = await model.findUnique({ where: { id: parsedData.id } });
            if (existingRecord) {
                // We could check timestamp, but a delete usually wins.
                await model.delete({ where: { id: parsedData.id } });
            }
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
            products,
            categories,
            customers,
            suppliers,
            services,
            sales,
            stockMovements
        ] = await Promise.all([
            this.prisma.organization.findUnique({ where: { id: organizationId } }),
            this.prisma.user.findMany({ where: { organizationId } }),
            this.prisma.product.findMany({ where: { organizationId }, include: { images: true } }),
            this.prisma.category.findMany({ where: { organizationId } }),
            this.prisma.customer.findMany({ where: { organizationId } }),
            this.prisma.supplier.findMany({ where: { organizationId } }),
            this.prisma.service.findMany({ where: { organizationId } }),
            this.prisma.sale.findMany({ where: { storeId: { in: storeIds } }, include: { items: true, payments: true } }),
            this.prisma.stockMovement.findMany({ where: { storeId: { in: storeIds } } }),
        ]);

        return {
            organization,
            stores,
            users,
            products,
            categories,
            customers,
            suppliers,
            services,
            sales,
            stockMovements,
            timestamp: new Date().toISOString(),
        };
    }
}

