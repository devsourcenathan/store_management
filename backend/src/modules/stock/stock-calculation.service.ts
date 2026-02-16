import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Stock Calculation Service
 * 
 * This service calculates stock levels from append-only movements.
 * IMPORTANT: Stock levels are NEVER stored directly in the database.
 * They are always calculated on-demand from the stock_movements table.
 */
@Injectable()
export class StockCalculationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate current stock level for a product in a store
     * 
     * @param productId - Product UUID
     * @param storeId - Store UUID
     * @returns Current stock quantity
     */
    async calculateCurrentStock(
        productId: string,
        storeId: string,
    ): Promise<number> {
        const movements = await this.prisma.stockMovement.findMany({
            where: {
                productId,
                storeId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return this.calculateStockFromMovements(movements);
    }

    /**
     * Calculate stock from a list of movements
     * 
     * @param movements - Array of stock movements
     * @returns Calculated stock quantity
     */
    private calculateStockFromMovements(movements: any[]): number {
        return movements.reduce((total, movement) => {
            switch (movement.type) {
                case 'IN':
                case 'RETURN':
                case 'SUPPLY':
                case 'TRANSFER_IN':
                    // Positive movements (add to stock)
                    return total + movement.quantity;

                case 'ADJUST':
                    // ADJUST stores direction in notes as JSON
                    try {
                        const meta = JSON.parse(movement.notes || '{}');
                        const direction = meta.direction || 'IN';
                        return direction === 'IN' ? total + movement.quantity : total - movement.quantity;
                    } catch {
                        // Fallback if notes is not JSON (old data)
                        return total + movement.quantity;
                    }

                case 'OUT':
                case 'SALE':
                case 'TRANSFER_OUT':
                case 'ADJUSTMENT':
                    // Negative movements (subtract from stock)
                    return total - movement.quantity;

                default:
                    return total;
            }
        }, 0);
    }

    /**
     * Calculate stock levels for all products in a store
     * 
     * @param storeId - Store UUID
     * @returns Map of productId -> stock quantity
     */
    async calculateAllStockInStore(
        storeId: string,
    ): Promise<Map<string, number>> {
        const movements = await this.prisma.stockMovement.findMany({
            where: { storeId },
            orderBy: {
                createdAt: 'asc',
            },
        });

        const stockByProduct = new Map<string, number>();

        movements.forEach((movement) => {
            const currentStock = stockByProduct.get(movement.productId) || 0;

            switch (movement.type) {
                case 'IN':
                case 'RETURN':
                case 'SUPPLY':
                case 'TRANSFER_IN':
                    stockByProduct.set(movement.productId, currentStock + movement.quantity);
                    break;

                case 'ADJUST':
                    // ADJUST stores direction in notes as JSON
                    try {
                        const meta = JSON.parse(movement.notes || '{}');
                        const direction = meta.direction || 'IN';
                        const newStock = direction === 'IN'
                            ? currentStock + movement.quantity
                            : currentStock - movement.quantity;
                        stockByProduct.set(movement.productId, newStock);
                    } catch {
                        // Fallback if notes is not JSON (old data)
                        stockByProduct.set(movement.productId, currentStock + movement.quantity);
                    }
                    break;

                case 'OUT':
                case 'SALE':
                case 'TRANSFER_OUT':
                case 'ADJUSTMENT':
                    stockByProduct.set(movement.productId, currentStock - movement.quantity);
                    break;
            }
        });

        return stockByProduct;
    }

    /**
     * Calculate stock history for a product (stock level at each movement)
     * 
     * @param productId - Product UUID
     * @param storeId - Store UUID
     * @returns Array of { date, quantity, movement }
     */
    async calculateStockHistory(
        productId: string,
        storeId: string,
    ): Promise<Array<{ date: Date; quantity: number; movement: any }>> {
        const movements = await this.prisma.stockMovement.findMany({
            where: {
                productId,
                storeId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        const history: Array<{ date: Date; quantity: number; movement: any }> = [];
        let runningTotal = 0;

        movements.forEach((movement) => {
            switch (movement.type) {
                case 'IN':
                case 'RETURN':
                case 'SUPPLY':
                case 'TRANSFER_IN':
                    runningTotal += movement.quantity;
                    break;

                case 'ADJUST':
                    // ADJUST stores direction in notes as JSON
                    try {
                        const meta = JSON.parse(movement.notes || '{}');
                        const direction = meta.direction || 'IN';
                        runningTotal = direction === 'IN'
                            ? runningTotal + movement.quantity
                            : runningTotal - movement.quantity;
                    } catch {
                        // Fallback if notes is not JSON (old data)
                        runningTotal += movement.quantity;
                    }
                    break;

                case 'OUT':
                case 'SALE':
                case 'TRANSFER_OUT':
                case 'ADJUSTMENT':
                    runningTotal -= movement.quantity;
                    break;
            }

            history.push({
                date: movement.createdAt,
                quantity: runningTotal,
                movement,
            });
        });

        return history;
    }

    /**
     * Validate if a stock movement is possible (enough stock for OUT/SALE)
     * 
     * @param productId - Product UUID
     * @param storeId - Store UUID
     * @param type - Movement type
     * @param quantity - Quantity to move
     * @returns true if movement is valid, false otherwise
     */
    async validateMovement(
        productId: string,
        storeId: string,
        type: string,
        quantity: number,
    ): Promise<{ valid: boolean; currentStock?: number; message?: string }> {
        const currentStock = await this.calculateCurrentStock(productId, storeId);

        const isOutbound = ['OUT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(type);

        // For outbound movements, check if we have enough stock
        if (isOutbound) {
            if (currentStock < quantity) {
                return {
                    valid: false,
                    currentStock,
                    message: `Insufficient stock. Current: ${currentStock}, Required: ${quantity}`,
                };
            }
        }

        return {
            valid: true,
            currentStock,
        };
    }

    /**
     * Get low stock products (below threshold)
     * 
     * @param storeId - Store UUID
     * @param threshold - Minimum stock level
     * @returns Array of products with low stock
     */
    async getLowStockProducts(
        storeId: string,
        threshold: number = 10,
    ): Promise<Array<{ productId: string; currentStock: number }>> {
        const stockMap = await this.calculateAllStockInStore(storeId);
        const lowStockProducts: Array<{ productId: string; currentStock: number }> = [];

        stockMap.forEach((quantity, productId) => {
            if (quantity <= threshold) {
                lowStockProducts.push({
                    productId,
                    currentStock: quantity,
                });
            }
        });

        return lowStockProducts;
    }
}
