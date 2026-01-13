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
                        minStock: true,
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

        const minStock = movement.product.minStock;

        if (currentStock <= minStock) {
            // Create alert if stock is low
            await this.prisma.stockAlert.create({
                data: {
                    productId: data.productId,
                    storeId: data.storeId,
                    threshold: minStock,
                    currentLevel: currentStock,
                },
            });
        } else {
            // Auto-resolve existing alerts if stock is healthy
            await this.prisma.stockAlert.updateMany({
                where: {
                    storeId: data.storeId,
                    productId: data.productId,
                    acknowledged: false,
                },
                data: {
                    acknowledged: true,
                    acknowledgedBy: 'SYSTEM', // Auto-resolved
                    acknowledgedAt: new Date(),
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

    async scanStockAlerts(storeId: string) {
        // Get store to find organization
        const store = await this.prisma.store.findUnique({ where: { id: storeId } });
        if (!store) throw new Error('Store not found');

        // Get all active products
        const products = await this.prisma.product.findMany({
            where: {
                organizationId: store.organizationId,
                isActive: true,
            },
            select: { id: true, minStock: true },
        });

        // Calculate current stock for all products in one go
        const stockMap = await this.stockCalculation.calculateAllStockInStore(storeId);

        let alertsCreated = 0;

        for (const product of products) {
            const currentStock = stockMap.get(product.id) || 0;

            if (currentStock <= product.minStock) {
                // Check if active alert already exists
                const existingAlert = await this.prisma.stockAlert.findFirst({
                    where: {
                        storeId,
                        productId: product.id,
                        acknowledged: false,
                    },
                });

                if (!existingAlert) {
                    await this.prisma.stockAlert.create({
                        data: {
                            productId: product.id,
                            storeId,
                            threshold: product.minStock,
                            currentLevel: currentStock,
                        },
                    });
                    alertsCreated++;
                }
            }
        }

        return { count: alertsCreated };
    }
}
