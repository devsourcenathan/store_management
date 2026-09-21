import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
     * Signed-quantity SQL fragment shared by the aggregate queries below.
     * ADJUST stores its direction in notes JSON; LIKE matching avoids
     * JSON parse errors on legacy non-JSON notes (treated as IN, like before).
     */
    private static readonly SIGNED_QTY_SQL = `
        CASE
            WHEN "type" IN ('IN', 'RETURN', 'SUPPLY', 'TRANSFER_IN') THEN "quantity"
            WHEN "type" IN ('OUT', 'SALE', 'TRANSFER_OUT', 'ADJUSTMENT') THEN -"quantity"
            WHEN "type" = 'ADJUST'
                AND ("notes" LIKE '%"direction":"OUT"%' OR "notes" LIKE '%"direction": "OUT"%')
                THEN -"quantity"
            WHEN "type" = 'ADJUST' THEN "quantity"
            ELSE 0
        END
    `;

    /**
     * Calculate current stock level for a product in a store
     *
     * Perf Phase 2: aggregated in SQL (SUM + CASE) instead of loading
     * every movement row into Node memory. O(1) transfer cost.
     *
     * @param productId - Product UUID
     * @param storeId - Store UUID
     * @returns Current stock quantity
     */
    async calculateCurrentStock(
        productId: string,
        storeId: string,
    ): Promise<number> {
        // Prisma.sql interpolates the CASE fragment as raw SQL,
        // while productId/storeId stay bound parameters.
        const signedQty = Prisma.sql([StockCalculationService.SIGNED_QTY_SQL]);
        const rows = await this.prisma.$queryRaw<Array<{ stock: bigint }>>`
            SELECT COALESCE(SUM(${signedQty}), 0) AS stock
            FROM "stock_movements"
            WHERE "productId" = ${productId} AND "storeId" = ${storeId}
        `;

        return Number(rows[0]?.stock ?? 0);
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
    /**
     * Perf Phase 2: GROUP BY in SQL — one row per product instead of
     * streaming the whole movement history into Node.
     */
    async calculateAllStockInStore(
        storeId: string,
    ): Promise<Map<string, number>> {
        const signedQty = Prisma.sql([StockCalculationService.SIGNED_QTY_SQL]);
        const rows = await this.prisma.$queryRaw<Array<{ productId: string; stock: bigint }>>`
            SELECT "productId" AS "productId", COALESCE(SUM(${signedQty}), 0) AS stock
            FROM "stock_movements"
            WHERE "storeId" = ${storeId}
            GROUP BY "productId"
        `;

        const stockByProduct = new Map<string, number>();
        for (const row of rows) {
            stockByProduct.set(row.productId, Number(row.stock));
        }

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
