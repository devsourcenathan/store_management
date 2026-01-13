import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StockService } from '../stock/stock.service';

@Injectable()
export class SalesService {
    constructor(
        private prisma: PrismaService,
        private stockService: StockService,
    ) { }

    async findAll(storeId: string) {
        return this.prisma.sale.findMany({
            where: { storeId },
            include: {
                customer: true,
                items: {
                    include: { product: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: any, userId: string) {
        const { storeId, customerId, items, notes } = data;

        // Calculate total
        const totalAmount = items.reduce((acc: number, item: any) => {
            return acc + (item.quantity * item.unitPrice) - (item.discount || 0);
        }, 0);

        // Use a transaction to create sale and stock movements
        return this.prisma.$transaction(async (tx) => {
            // 1. Create the sale
            const sale = await tx.sale.create({
                data: {
                    storeId,
                    customerId,
                    totalAmount,
                    status: 'PAID', // Simplified
                    notes,
                    createdBy: userId,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: item.discount || 0,
                            total: (item.quantity * item.unitPrice) - (item.discount || 0),
                        })),
                    },
                },
            });

            // 2. Create stock movements for each item
            for (const item of items) {
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        storeId,
                        type: 'OUT',
                        source: 'SALE',
                        quantity: item.quantity,
                        reference: `SALE-${sale.id}`,
                        createdBy: userId,
                    },
                });
            }

            return sale;
        });
    }
}
