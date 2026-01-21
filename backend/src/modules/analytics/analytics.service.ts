import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, subDays, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats(storeId: string, startDate?: string, endDate?: string) {
        // Default to today if no date range provided, but if range provided, use it
        // Ideally "getDashboardStats" usually implies "Current Snapshot" + "Period Revenue"
        // Let's assume startDate/endDate ONLY affects the revenue calculation, as stock/products are point-in-time

        let dateFilter: any = {};

        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            };
        } else {
            // Default to today for revenue if no filter
            const today = startOfDay(new Date());
            dateFilter = {
                createdAt: {
                    gte: today
                }
            };
        }

        const [totalProducts, lowStockItems, salesRevenue, pendingOrders] = await Promise.all([
            // Total Products (Active)
            this.prisma.product.count({
                where: { isActive: true }
            }),

            // Low Stock Items (Unresolved Alerts)
            this.prisma.stockAlert.count({
                where: {
                    storeId,
                    acknowledged: false
                }
            }),

            // Sales Revenue (Filtered by date)
            this.prisma.sale.aggregate({
                where: {
                    storeId,
                    status: 'PAID',
                    ...dateFilter
                },
                _sum: {
                    totalAmount: true
                }
            }),

            // Pending Supply Orders
            this.prisma.supply.count({
                where: {
                    status: 'PENDING'
                }
            })
        ]);

        return {
            totalProducts,
            lowStockItems,
            todaysSales: salesRevenue._sum.totalAmount || 0, // Label kept as todaysSales for frontend compat, but represents "Period Revenue"
            pendingOrders
        };
    }

    async getSalesTrend(storeId: string, days: number = 7, startDate?: string, endDate?: string) {
        let dateFilter: any = {};
        let groupFormat = 'MMM dd'; // Default daily grouping

        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            };
        } else {
            // Default to last N days
            dateFilter = {
                createdAt: {
                    gte: subDays(new Date(), days)
                }
            };
        }

        const sales = await this.prisma.sale.findMany({
            where: {
                storeId,
                status: 'PAID',
                ...dateFilter
            },
            select: {
                createdAt: true,
                totalAmount: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Grouping Logic
        const groupedData = new Map<string, number>();

        // If specific range, we might want to pre-fill dates, but for now let's just group actuals to be safe or fill range if small
        // For simplicity in this fix, we will just return the actuals grouped by day

        sales.forEach(sale => {
            const dateStr = format(sale.createdAt, 'yyyy-MM-dd');
            const current = groupedData.get(dateStr) || 0;
            groupedData.set(dateStr, current + Number(sale.totalAmount));
        });

        // If using default "last 7 days", ensure 0-filling
        if (!startDate && !endDate && days > 0) {
            for (let i = 0; i <= days; i++) {
                const date = subDays(new Date(), days - i);
                const dateStr = format(date, 'yyyy-MM-dd');
                if (!groupedData.has(dateStr)) {
                    groupedData.set(dateStr, 0);
                }
            }
        }

        // Convert map to sorted array
        return Array.from(groupedData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, amount]) => ({
                date: format(new Date(date), groupFormat),
                amount
            }));
    }

    async getTopProducts(storeId: string, startDate?: string, endDate?: string) {
        let dateFilterClause = "";

        if (startDate && endDate) {
            // Prisma raw query needs proper formatting or parameter injection
            // For simplicity with $queryRaw, we'll try to rely on Prisma's parameterization if possible, 
            // but dynamic WHERE clauses are tricky. 
            // Let's use a helper or simple string interpolation with proper casting if trusted, 
            // OR better: use Prisma findMany with groupBy if possible, OR just fetch all items in range and aggregate in app (easier for TS safety)

            // Actually, let's stick to raw query but be careful.
            // We can just construct the SQL with parameters.
            // However, `startDate` and `endDate` are strings.

            return this.getTopProductsRaw(storeId, startDate, endDate);
        }

        // Default to last 30 days if no range
        const defaultStart = subDays(new Date(), 30).toISOString();
        const defaultEnd = new Date().toISOString();

        return this.getTopProductsRaw(storeId, defaultStart, defaultEnd);
    }

    private async getTopProductsRaw(storeId: string, startDate: string, endDate: string) {
        const topProducts = await this.prisma.$queryRaw`
            SELECT 
                p.name, 
                SUM(si.quantity) as "totalQuantity",
                SUM(si.quantity * si."unitPrice") as "totalRevenue"
            FROM sale_items si
            JOIN sales s ON si."saleId" = s.id
            JOIN products p ON si."productId" = p.id
            WHERE s."storeId" = ${storeId}
            AND s.status = 'PAID'
            AND s."createdAt" >= ${new Date(startDate)}
            AND s."createdAt" <= ${new Date(endDate)}
            GROUP BY p.id, p.name
            ORDER BY "totalQuantity" DESC
            LIMIT 5
        `;

        return JSON.parse(JSON.stringify(topProducts, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value
        ));
    }

    /**
     * Get aggregated statistics across all stores for an organization (OWNER)
     */
    async getOwnerAggregatedStats(organizationId: string, startDate?: string, endDate?: string) {
        let dateFilter: any = {};

        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            };
        } else {
            // Default to current month
            const now = new Date();
            dateFilter = {
                createdAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), 1),
                    lte: now
                }
            };
        }

        // Get all stores for this organization
        const stores = await this.prisma.store.findMany({
            where: { organizationId },
            select: { id: true }
        });

        const storeIds = stores.map(s => s.id);

        const [totalSalesRevenue, totalSalesCount, totalProducts, totalCustomers, salesWithItems] = await Promise.all([
            // Total Sales Revenue (prix de vente total)
            this.prisma.sale.aggregate({
                where: {
                    storeId: { in: storeIds },
                    status: 'PAID',
                    ...dateFilter
                },
                _sum: {
                    totalAmount: true
                }
            }),

            // Total number of sales
            this.prisma.sale.count({
                where: {
                    storeId: { in: storeIds },
                    status: 'PAID',
                    ...dateFilter
                }
            }),

            // Total active products
            this.prisma.product.count({
                where: { isActive: true }
            }),

            // Total customers
            this.prisma.customer.count({
                where: { organizationId }
            }),

            // Get all sales with items to calculate profit
            this.prisma.sale.findMany({
                where: {
                    storeId: { in: storeIds },
                    status: 'PAID',
                    ...dateFilter
                },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    costPrice: true
                                }
                            }
                        }
                    }
                }
            })
        ]);


        // Calculate net profit (Chiffre d'affaires réel - Coût total d'achat)
        let totalCostOfGoodsSold = 0;
        salesWithItems.forEach(sale => {
            sale.items.forEach(item => {
                const costPrice = Number(item.product?.costPrice || 0);
                const quantity = item.quantity;
                totalCostOfGoodsSold += costPrice * quantity;
            });
        });

        // Net Profit = Total Sales Revenue (with discounts applied) - Total Cost of Goods Sold
        const actualSalesRevenue = Number(totalSalesRevenue._sum.totalAmount || 0);
        const totalProfit = actualSalesRevenue - totalCostOfGoodsSold;

        return {
            totalSalesRevenue: actualSalesRevenue,
            totalProfit: totalProfit,
            totalSales: totalSalesCount,
            totalProducts,
            totalCustomers,
            totalStores: stores.length
        };
    }

    /**
     * Get statistics broken down by individual store (OWNER)
     */
    async getOwnerStatsByStore(organizationId: string, startDate?: string, endDate?: string) {
        let dateFilter: any = {};

        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            };
        } else {
            // Default to current month
            const now = new Date();
            dateFilter = {
                createdAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), 1),
                    lte: now
                }
            };
        }

        const stores = await this.prisma.store.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
                address: true
            }
        });

        const statsPromises = stores.map(async (store) => {
            const [revenue, salesCount, productCount] = await Promise.all([
                this.prisma.sale.aggregate({
                    where: {
                        storeId: store.id,
                        status: 'PAID',
                        ...dateFilter
                    },
                    _sum: {
                        totalAmount: true
                    }
                }),
                this.prisma.sale.count({
                    where: {
                        storeId: store.id,
                        status: 'PAID',
                        ...dateFilter
                    }
                }),
                this.prisma.stockMovement.groupBy({
                    by: ['productId'],
                    where: {
                        storeId: store.id
                    }
                }).then(result => result.length)
            ]);

            return {
                storeId: store.id,
                storeName: store.name,
                storeAddress: store.address,
                revenue: revenue._sum.totalAmount || 0,
                salesCount,
                productCount
            };
        });

        return Promise.all(statsPromises);
    }

    /**
     * Get store comparison data for charts (OWNER)
     */
    async getStoreComparison(organizationId: string, startDate?: string, endDate?: string) {
        const statsByStore = await this.getOwnerStatsByStore(organizationId, startDate, endDate);

        return {
            stores: statsByStore.map(s => s.storeName),
            revenues: statsByStore.map(s => s.revenue),
            sales: statsByStore.map(s => s.salesCount),
            products: statsByStore.map(s => s.productCount)
        };
    }
}
