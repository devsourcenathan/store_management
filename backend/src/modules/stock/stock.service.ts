import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { StockCalculationService } from './stock-calculation.service';

@Injectable()
export class StockService {
    constructor(
        private prisma: PrismaService,
        private stockCalculation: StockCalculationService,
    ) { }

    async getMovements(storeId: string, productId?: string) {
        return this.prisma.stockMovement.findMany({
            where: {
                storeId,
                ...(productId && { productId }),
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createMovement(data: any, userId: string) {
        // Validate movement if it's outbound
        const isOutbound = ['OUT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(data.type);
        if (isOutbound) {
            const validation = await this.stockCalculation.validateMovement(
                data.productId,
                data.storeId,
                data.type,
                data.quantity,
            );

            if (!validation.valid) {
                throw new Error(validation.message);
            }
        }

        // Create movement
        const movement = await this.prisma.stockMovement.create({
            data: {
                ...data,
                createdBy: userId,
            },
            include: {
                product: true,
            },
        });

        // Check for low stock alerts
        const currentStock = await this.stockCalculation.calculateCurrentStock(
            data.productId,
            data.storeId,
        );

        // Create alert if stock is low (threshold: 10)
        if (currentStock <= 10) {
            await this.prisma.stockAlert.create({
                data: {
                    productId: data.productId,
                    storeId: data.storeId,
                    threshold: 10,
                    currentLevel: currentStock,
                },
            });
        }

        return movement;
    }

    async getCurrentStock(productId: string, storeId: string) {
        const quantity = await this.stockCalculation.calculateCurrentStock(
            productId,
            storeId,
        );

        return {
            productId,
            storeId,
            quantity,
        };
    }

    async getAllStockInStore(storeId: string) {
        const stockMap = await this.stockCalculation.calculateAllStockInStore(storeId);

        const products = await this.prisma.product.findMany({
            where: {
                id: { in: Array.from(stockMap.keys()) },
            },
            select: {
                id: true,
                name: true,
                sku: true,
            },
        });

        return products.map((product) => ({
            ...product,
            quantity: stockMap.get(product.id) || 0,
        }));
    }

    async getStockHistory(productId: string, storeId: string) {
        return this.stockCalculation.calculateStockHistory(productId, storeId);
    }

    async getLowStockAlerts(storeId: string) {
        return this.prisma.stockAlert.findMany({
            where: {
                storeId,
                acknowledged: false,
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async acknowledgeAlert(alertId: string, userId: string) {
        return this.prisma.stockAlert.update({
            where: { id: alertId },
            data: {
                acknowledged: true,
                acknowledgedBy: userId,
                acknowledgedAt: new Date(),
            },
        });
    }
}
