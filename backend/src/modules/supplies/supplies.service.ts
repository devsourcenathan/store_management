import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StockService } from '../stock/stock.service';

@Injectable()
export class SuppliesService {
    constructor(
        private prisma: PrismaService,
        private stockService: StockService,
    ) { }

    async findAll(organizationId: string) {
        return this.prisma.supply.findMany({
            where: {
                supplier: {
                    organizationId
                }
            },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async create(data: any, userId: string) {
        const { supplierId, items, notes } = data;

        // Calculate total
        const totalAmount = items.reduce((acc: number, item: any) => {
            return acc + (item.quantity * item.unitCost);
        }, 0);

        return this.prisma.supply.create({
            data: {
                supplierId,
                totalAmount,
                status: 'PENDING',
                notes,
                createdBy: userId,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        total: item.quantity * item.unitCost
                    }))
                }
            },
            include: {
                items: true
            }
        });
    }

    async receive(id: string, storeId: string, userId: string, receivedItems?: { productId: string, quantity: number }[]) {
        const supply = await this.prisma.supply.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!supply) {
            throw new NotFoundException('Supply order not found');
        }

        if (supply.status === 'PAID') {
            throw new BadRequestException('Supply order already received/paid');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. If receivedItems provided, update supply items and total
            if (receivedItems && receivedItems.length > 0) {
                for (const receivedItem of receivedItems) {
                    const originalItem = supply.items.find(i => i.productId === receivedItem.productId);
                    if (originalItem) {
                        // Update quantity and total for the item
                        await tx.supplyItem.update({
                            where: { id: originalItem.id },
                            data: {
                                quantity: receivedItem.quantity,
                                total: Number(originalItem.unitCost) * receivedItem.quantity
                            }
                        });
                    }
                }
            }

            // Re-fetch items to get updated values (or calculate in memory, but fetch is safer for consistency)
            const updatedItems = await tx.supplyItem.findMany({ where: { supplyId: id } });

            // Recalculate Supply Total
            const newTotalAmount = updatedItems.reduce((acc, item) => acc + Number(item.total), 0);

            // 2. Update status and total
            const updatedSupply = await tx.supply.update({
                where: { id },
                data: {
                    status: 'PAID',
                    totalAmount: newTotalAmount, // Update total to match received goods
                    paidAmount: newTotalAmount, // Assume full payment of received goods
                    updatedAt: new Date()
                }
            });

            // 3. Create Stock Movements (IN) based on (potentially updated) items
            for (const item of updatedItems) {
                if (item.quantity > 0) {
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            storeId,
                            type: 'SUPPLY',
                            source: 'SUPPLY',
                            quantity: item.quantity,
                            reference: `SUPPLY-${supply.id}`,
                            createdBy: userId,
                        }
                    });
                }
            }

            return updatedSupply;
        });

        // 4. Trigger Stock alerts (outside transaction)
        // We fetching original supply items again? No, we need fresh list.
        // We can just iterate over the receivedItems keys or re-read. 
        // Optimization: just check stock for all products involved.
        const finalItems = await this.prisma.supplyItem.findMany({ where: { supplyId: id } });
        for (const item of finalItems) {
            await this.stockService.checkStockAndAlert(item.productId, storeId);
        }
    }
    async delete(id: string) {
        const supply = await this.prisma.supply.findUnique({
            where: { id }
        });

        if (!supply) {
            throw new NotFoundException('Supply order not found');
        }

        if (supply.status === 'PAID') {
            throw new BadRequestException('Cannot delete a received/paid supply order');
        }

        return this.prisma.supply.delete({
            where: { id }
        });
    }
}
