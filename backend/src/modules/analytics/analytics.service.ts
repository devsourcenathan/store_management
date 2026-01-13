import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, subDays, format } from 'date-fns';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats(storeId: string) {
        const today = startOfDay(new Date());

        const [totalProducts, lowStockItems, todaysSales, pendingOrders] = await Promise.all([
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

            // Today's Sales Revenue
            this.prisma.sale.aggregate({
                where: {
                    storeId,
                    createdAt: {
                        gte: today
                    },
                    status: 'PAID'
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
            todaysSales: todaysSales._sum.totalAmount || 0,
            pendingOrders
        };
    }

    async getSalesTrend(storeId: string, days: number = 7) {
        const startDate = subDays(new Date(), days);

        const sales = await this.prisma.sale.findMany({
            where: {
                storeId,
                createdAt: {
                    gte: startDate
                },
                status: 'PAID'
            },
            select: {
                createdAt: true,
                totalAmount: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Group by date
        const groupedData = new Map<string, number>();

        // Initialize all days with 0
        for (let i = 0; i <= days; i++) {
            const date = subDays(new Date(), days - i);
            const dateStr = format(date, 'yyyy-MM-dd');
            groupedData.set(dateStr, 0);
        }

        // Fill with actual data
        sales.forEach(sale => {
            const dateStr = format(sale.createdAt, 'yyyy-MM-dd');
            const current = groupedData.get(dateStr) || 0;
            groupedData.set(dateStr, current + Number(sale.totalAmount));
        });

        return Array.from(groupedData.entries()).map(([date, amount]) => ({
            date: format(new Date(date), 'MMM dd'),
            amount
        }));
    }

    async getTopProducts(storeId: string) {
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
}
