import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    private toNumber(value: Decimal | number | null | undefined): number {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return value.toNumber();
    }

    async generateDailyReport(organizationId: string, date: Date = new Date(), storeId?: string) {
        const yesterday = subDays(date, 1);
        const startDate = startOfDay(yesterday);
        const endDate = endOfDay(yesterday);

        const sales = await this.prisma.sale.findMany({
            where: {
                store: {
                    organizationId,
                    ...(storeId && { id: storeId }),
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'PAID',
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                store: true,
            },
        });

        const revenue = sales.reduce((sum, sale) => sum + this.toNumber(sale.totalAmount), 0);

        // Calculate profit (Total Amount - Total Cost of items)
        let totalCost = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                // Note: Using current cost price as historical cost might not be stored
                totalCost += item.quantity * this.toNumber(item.product.costPrice);
            });
        });
        const profit = revenue - totalCost;
        const salesCount = sales.length;

        // Top products
        const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const existing = productSales.get(item.productId) || {
                    name: item.product.name,
                    quantity: 0,
                    revenue: 0,
                };
                existing.quantity += item.quantity;
                existing.revenue += this.toNumber(item.total);
                productSales.set(item.productId, existing);
            });
        });

        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Compare with previous day
        const dayBeforeYesterday = subDays(yesterday, 1);
        const prevStartDate = startOfDay(dayBeforeYesterday);
        const prevEndDate = endOfDay(dayBeforeYesterday);

        const prevSales = await this.prisma.sale.findMany({
            where: {
                store: {
                    organizationId,
                    ...(storeId && { id: storeId }),
                },
                createdAt: {
                    gte: prevStartDate,
                    lte: prevEndDate,
                },
                status: 'PAID',
            },
            include: {
                items: {
                    include: {
                        product: true,
                    }
                }
            }
        });

        const prevRevenue = prevSales.reduce((sum, sale) => sum + this.toNumber(sale.totalAmount), 0);
        let prevTotalCost = 0;
        prevSales.forEach(sale => {
            sale.items.forEach(item => {
                prevTotalCost += item.quantity * this.toNumber(item.product.costPrice);
            });
        });
        const prevProfit = prevRevenue - prevTotalCost;

        const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
        const profitChange = prevProfit > 0 ? ((profit - prevProfit) / prevProfit) * 100 : 0;

        // Low stock alerts (from StockAlerts table)
        const alerts = await this.prisma.stockAlert.findMany({
            where: {
                store: {
                    organizationId,
                    ...(storeId && { id: storeId }),
                },
                acknowledged: false,
            },
            include: {
                product: true,
                store: true,
            },
            take: 10,
        });

        // Store performance
        const storePerformance = new Map<string, { storeName: string; revenue: number; salesCount: number }>();
        sales.forEach(sale => {
            const existing = storePerformance.get(sale.storeId) || {
                storeName: sale.store.name,
                revenue: 0,
                salesCount: 0,
            };
            existing.revenue += this.toNumber(sale.totalAmount);
            existing.salesCount += 1;
            storePerformance.set(sale.storeId, existing);
        });

        // Maintenance Stats
        const maintenances = await this.prisma.maintenance.findMany({
            where: {
                organizationId,
                status: 'DONE',
                completedAt: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            include: {
                parts: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const maintenanceRevenue = maintenances.reduce((sum, m) => sum + this.toNumber(m.totalCost), 0);
        let maintenanceCost = 0;
        maintenances.forEach(m => {
            m.parts.forEach(p => {
                maintenanceCost += p.quantity * this.toNumber(p.product.costPrice);
            });
        });
        const maintenanceProfit = maintenanceRevenue - maintenanceCost;
        const maintenanceCount = maintenances.length;

        // Total Revenue & Profit
        const totalRevenue = revenue + maintenanceRevenue;
        const totalProfit = profit + maintenanceProfit;

        return {
            date: yesterday.toISOString().split('T')[0],
            revenue: totalRevenue, // Combined
            salesRevenue: revenue,
            maintenanceRevenue,
            profit: totalProfit,
            salesProfit: profit,
            maintenanceProfit,
            salesCount,
            maintenanceCount,
            topProducts,
            comparison: {
                revenueChange: Math.round(revenueChange * 100) / 100, // Note: this compares only sales revenue change unless we update prev period too. Keeping simple for now.
                profitChange: Math.round(profitChange * 100) / 100,
            },
            lowStockAlerts: alerts.map(a => ({
                product: { name: a.product.name },
                store: { name: a.store.name },
                currentLevel: a.currentLevel,
                threshold: a.threshold,
            })),
            storePerformance: Array.from(storePerformance.values()),
        };
    }

    async generateWeeklyReport(organizationId: string, date: Date = new Date(), storeId?: string) {
        const startDate = startOfWeek(date, { weekStartsOn: 1 });
        const endDate = endOfWeek(date, { weekStartsOn: 1 });

        const sales = await this.prisma.sale.findMany({
            where: {
                store: {
                    organizationId,
                    ...(storeId && { id: storeId }),
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'PAID',
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                customer: true,
            },
        });

        const revenue = sales.reduce((sum, sale) => sum + this.toNumber(sale.totalAmount), 0);
        let totalCost = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                totalCost += item.quantity * this.toNumber(item.product.costPrice);
            });
        });
        const profit = revenue - totalCost;

        const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const existing = productSales.get(item.productId) || {
                    name: item.product.name,
                    quantity: 0,
                    revenue: 0,
                };
                existing.quantity += item.quantity;
                existing.revenue += this.toNumber(item.total);
                productSales.set(item.productId, existing);
            });
        });

        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        const customerSales = new Map<string, { name: string; purchases: number; totalSpent: number }>();
        sales.forEach(sale => {
            if (sale.customer) {
                const existing = customerSales.get(sale.customerId!) || {
                    name: sale.customer.name,
                    purchases: 0,
                    totalSpent: 0,
                };
                existing.purchases += 1;
                existing.totalSpent += this.toNumber(sale.totalAmount);
                customerSales.set(sale.customerId!, existing);
            }
        });

        const topCustomers = Array.from(customerSales.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        // Maintenance Stats
        const maintenances = await this.prisma.maintenance.findMany({
            where: {
                organizationId,
                status: 'DONE',
                completedAt: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            include: {
                parts: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const maintenanceRevenue = maintenances.reduce((sum, m) => sum + this.toNumber(m.totalCost), 0);
        let maintenanceCost = 0;
        maintenances.forEach(m => {
            m.parts.forEach(p => {
                maintenanceCost += p.quantity * this.toNumber(p.product.costPrice);
            });
        });
        const maintenanceProfit = maintenanceRevenue - maintenanceCost;
        const maintenanceCount = maintenances.length;

        return {
            week: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
            revenue: revenue + maintenanceRevenue,
            salesRevenue: revenue,
            maintenanceRevenue,
            profit: profit + maintenanceProfit,
            salesCount: sales.length,
            maintenanceCount,
            topProducts,
            topCustomers,
        };
    }

    async generateMonthlyReport(organizationId: string, date: Date = new Date(), storeId?: string) {
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);

        const sales = await this.prisma.sale.findMany({
            where: {
                store: {
                    organizationId,
                    ...(storeId && { id: storeId }),
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'PAID',
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                    },
                },
            },
        });

        const revenue = sales.reduce((sum, sale) => sum + this.toNumber(sale.totalAmount), 0);
        let totalCost = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                totalCost += item.quantity * this.toNumber(item.product.costPrice);
            });
        });
        const profit = revenue - totalCost;

        const categoryRevenue = new Map<string, { name: string; revenue: number }>();
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (item.product.categoryId) {
                    // product.category can be null if category is deleted or not properly included
                    // but we included it.
                    const categoryName = item.product.category?.name || 'Uncategorized';
                    const categoryId = item.product.categoryId || 'uncategorized';

                    const existing = categoryRevenue.get(categoryId) || {
                        name: categoryName,
                        revenue: 0,
                    };
                    existing.revenue += this.toNumber(item.total);
                    categoryRevenue.set(categoryId, existing);
                }
            });
        });

        // Maintenance Stats
        const maintenances = await this.prisma.maintenance.findMany({
            where: {
                organizationId,
                status: 'DONE',
                completedAt: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            include: {
                parts: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const maintenanceRevenue = maintenances.reduce((sum, m) => sum + this.toNumber(m.totalCost), 0);
        let maintenanceCost = 0;
        maintenances.forEach(m => {
            m.parts.forEach(p => {
                maintenanceCost += p.quantity * this.toNumber(p.product.costPrice);
            });
        });
        const maintenanceProfit = maintenanceRevenue - maintenanceCost;
        const maintenanceCount = maintenances.length;

        return {
            month: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
            revenue: revenue + maintenanceRevenue,
            salesRevenue: revenue,
            maintenanceRevenue,
            profit: profit + maintenanceProfit,
            salesCount: sales.length,
            maintenanceCount,
            categoryPerformance: Array.from(categoryRevenue.values())
                .sort((a, b) => b.revenue - a.revenue),
        };
    }

    async generateQuarterlyReport(organizationId: string, date: Date = new Date(), storeId?: string) {
        const startDate = startOfQuarter(date);
        const endDate = endOfQuarter(date);

        const sales = await this.prisma.sale.findMany({
            where: {
                store: {
                    organizationId,
                    ...(storeId && { id: storeId }),
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'PAID',
            },
            include: {
                items: {
                    include: {
                        product: true,
                    }
                }
            }
        });

        const revenue = sales.reduce((sum, sale) => sum + this.toNumber(sale.totalAmount), 0);
        let totalCost = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                totalCost += item.quantity * this.toNumber(item.product.costPrice);
            });
        });
        const profit = revenue - totalCost;

        const quarter = Math.floor(date.getMonth() / 3) + 1;

        // Maintenance Stats
        const maintenances = await this.prisma.maintenance.findMany({
            where: {
                organizationId,
                status: 'DONE',
                completedAt: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            include: {
                parts: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const maintenanceRevenue = maintenances.reduce((sum, m) => sum + this.toNumber(m.totalCost), 0);
        let maintenanceCost = 0;
        maintenances.forEach(m => {
            m.parts.forEach(p => {
                maintenanceCost += p.quantity * this.toNumber(p.product.costPrice);
            });
        });
        const maintenanceProfit = maintenanceRevenue - maintenanceCost;
        const maintenanceCount = maintenances.length;

        return {
            quarter,
            year: date.getFullYear(),
            revenue: revenue + maintenanceRevenue,
            salesRevenue: revenue,
            maintenanceRevenue,
            profit: profit + maintenanceProfit,
            salesCount: sales.length,
            maintenanceCount,
        };
    }

    async generateYearlyReport(organizationId: string, date: Date = new Date(), storeId?: string) {
        const startDate = startOfYear(date);
        const endDate = endOfYear(date);

        const sales = await this.prisma.sale.findMany({
            where: {
                store: {
                    organizationId,
                    ...(storeId && { id: storeId }),
                },
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'PAID',
            },
            include: {
                items: {
                    include: {
                        product: true,
                    }
                }
            }
        });

        const revenue = sales.reduce((sum, sale) => sum + this.toNumber(sale.totalAmount), 0);
        let totalCost = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                totalCost += item.quantity * this.toNumber(item.product.costPrice);
            });
        });
        const profit = revenue - totalCost;

        // Maintenance Stats
        const maintenances = await this.prisma.maintenance.findMany({
            where: {
                organizationId,
                status: 'DONE',
                completedAt: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            include: {
                parts: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const maintenanceRevenue = maintenances.reduce((sum, m) => sum + this.toNumber(m.totalCost), 0);
        let maintenanceCost = 0;
        maintenances.forEach(m => {
            m.parts.forEach(p => {
                maintenanceCost += p.quantity * this.toNumber(p.product.costPrice);
            });
        });
        const maintenanceProfit = maintenanceRevenue - maintenanceCost;
        const maintenanceCount = maintenances.length;

        return {
            year: date.getFullYear(),
            revenue: revenue + maintenanceRevenue,
            salesRevenue: revenue,
            maintenanceRevenue,
            profit: profit + maintenanceProfit,
            salesCount: sales.length,
            maintenanceCount,
        };
    }
}
