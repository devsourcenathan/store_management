import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DangerZoneService {
    private readonly logger = new Logger(DangerZoneService.name);

    constructor(private prisma: PrismaService) { }

    async resetModule(organizationId: string, module: string, clientId: string) {
        this.logger.warn(`Resetting module ${module} for organization ${organizationId} (client: ${clientId})`);
        
        // Exécution de la réinitialisation locale sans logging de synchro individuel
        await this.performReset(organizationId, module);

        // Si on n'est pas déjà dans une exécution déclenchée par un pull distant,
        // on génère l'événement de synchro virtuel pour que les autres l'exécutent.
        if (clientId !== 'SERVER_SYNC_APPLY') {
            await this.prisma.syncOperation.create({
                data: {
                    action: 'RESET_MODULE',
                    entity: 'SystemAction',
                    entityId: `reset-${module}-${Date.now()}`,
                    data: JSON.stringify({ target: module, organizationId }),
                    clientId: clientId,
                    synced: false,
                }
            });
        }
    }

    async performReset(organizationId: string, target: string) {
        // Obtenir les storeIds pour les entités rattachées au magasin
        const stores = await this.prisma.store.findMany({ where: { organizationId }, select: { id: true } });
        const storeIds = stores.map(s => s.id);

        switch (target) {
            case 'SALES':
                await this.prisma.sale.deleteMany({ where: { storeId: { in: storeIds } } });
                await this.prisma.creditContract.deleteMany({ where: { sale: { storeId: { in: storeIds } } } });
                break;
            case 'INVENTORY':
                await this.prisma.product.deleteMany({ where: { organizationId } });
                await this.prisma.category.deleteMany({ where: { organizationId } });
                // Note: StockMovement and StockAlert will be cascade deleted if attached to product
                break;
            case 'CUSTOMERS':
                await this.prisma.customer.deleteMany({ where: { organizationId } });
                await this.prisma.device.deleteMany({ where: { organizationId } });
                await this.prisma.maintenance.deleteMany({ where: { organizationId } });
                break;
            case 'SUPPLIERS':
                await this.prisma.supplier.deleteMany({ where: { organizationId } });
                await this.prisma.supply.deleteMany({ where: { supplier: { organizationId } } });
                break;
            case 'ALL':
                await this.prisma.sale.deleteMany({ where: { storeId: { in: storeIds } } });
                await this.prisma.creditContract.deleteMany({ where: { sale: { storeId: { in: storeIds } } } });
                await this.prisma.product.deleteMany({ where: { organizationId } });
                await this.prisma.category.deleteMany({ where: { organizationId } });
                await this.prisma.customer.deleteMany({ where: { organizationId } });
                await this.prisma.device.deleteMany({ where: { organizationId } });
                await this.prisma.maintenance.deleteMany({ where: { organizationId } });
                await this.prisma.supplier.deleteMany({ where: { organizationId } });
                await this.prisma.supply.deleteMany({ where: { supplier: { organizationId } } });
                await this.prisma.service.deleteMany({ where: { organizationId } });
                await this.prisma.media.deleteMany({ where: { organizationId } });
                // We keep users, stores, rolePermissions, etc.
                break;
            default:
                throw new Error(`Unknown reset target: ${target}`);
        }
        
        this.logger.log(`Module ${target} reset completed for org ${organizationId}`);
    }
}
