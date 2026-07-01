import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface UserAnalyticsParams {
    organizationId: string;
    userId?: string;
    storeId?: string;
    startDate: Date;
    endDate: Date;
}

export interface PeriodParams {
    organizationId: string;
    userId?: string;
    storeId?: string;
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    startDate?: Date;
    endDate?: Date;
}

@Injectable()
export class UserAnalyticsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate date range based on period
     */
    private calculateDateRange(period: string, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
        const now = new Date();

        switch (period) {
            case 'day':
                return { startDate: startOfDay(now), endDate: endOfDay(now) };
            case 'week':
                return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
            case 'month':
                return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const startMonth = currentQuarter * 3;
                return {
                    startDate: new Date(now.getFullYear(), startMonth, 1, 0, 0, 0, 0),
                    endDate: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999)
                };
            case 'year':
                return { startDate: startOfYear(now), endDate: endOfYear(now) };
            case 'custom':
                if (!customStart || !customEnd) {
                    // Return default (month) if dates are missing for custom period
                    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
                }
                return { startDate: customStart, endDate: customEnd };
            default:
                return { startDate: startOfDay(now), endDate: endOfDay(now) };
        }
    }

    /**
     * Get sales statistics by user
     */
    async getUserSalesStats(params: UserAnalyticsParams) {
        const { organizationId, userId, storeId, startDate, endDate } = params;

        const baseWhere: any = {
            createdAt: {
                gte: startDate,
                lte: endDate
            },
            ...(storeId && { storeId })
        };

        // Build where clause for sales
        const where: any = {
            ...baseWhere,
            status: 'PAID',
            ...(userId && { createdBy: userId })
        };

        // If no userId specified, get stats for all users
        if (!userId) {
            // Get all users in the organization
            const users = await this.prisma.user.findMany({
                where: { organizationId },
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
            });

            const userStats = await Promise.all(users.map(async (user) => {
                const [salesCount, salesAggregate, itemsCount, miscInAggr, miscOutAggr, cashDiffAggr] = await Promise.all([
                    // Number of sales
                    this.prisma.sale.count({
                        where: { ...where, createdBy: user.id }
                    }),

                    // Total amount
                    this.prisma.sale.aggregate({
                        where: { ...where, createdBy: user.id },
                        _sum: { totalAmount: true }
                    }),

                    // Total items sold
                    this.prisma.saleItem.aggregate({
                        where: {
                            sale: { ...where, createdBy: user.id }
                        },
                        _sum: { quantity: true }
                    }),

                    // Misc IN
                    this.prisma.miscTransaction.aggregate({
                        where: { ...baseWhere, type: 'IN', createdBy: user.id },
                        _sum: { amount: true }
                    }),

                    // Misc OUT
                    this.prisma.miscTransaction.aggregate({
                        where: { ...baseWhere, type: 'OUT', createdBy: user.id },
                        _sum: { amount: true }
                    }),

                    // Cash Adjustments Difference
                    this.prisma.cashAdjustment.aggregate({
                        where: { ...baseWhere, createdBy: user.id },
                        _sum: { difference: true }
                    })
                ]);

                const totalAmount = Number(salesAggregate._sum.totalAmount || 0);
                const miscRevenue = Number(miscInAggr._sum.amount || 0);
                const miscExpenses = Number(miscOutAggr._sum.amount || 0);
                const cashDifference = Number(cashDiffAggr._sum.difference || 0);

                const averageBasket = salesCount > 0 ? totalAmount / salesCount : 0;

                return {
                    user: {
                        id: user.id,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role
                    },
                    salesCount,
                    totalAmount,
                    miscRevenue,
                    miscExpenses,
                    cashDifference,
                    itemsSold: itemsCount._sum.quantity || 0,
                    averageBasket
                };
            }));

            return userStats.filter(stat => stat.salesCount > 0);
        }

        // Single user stats
        const [salesCount, salesAggregate, itemsCount, miscInAggr, miscOutAggr, cashDiffAggr] = await Promise.all([
            this.prisma.sale.count({ where }),
            this.prisma.sale.aggregate({
                where,
                _sum: { totalAmount: true }
            }),
            this.prisma.saleItem.aggregate({
                where: { sale: where },
                _sum: { quantity: true }
            }),
            this.prisma.miscTransaction.aggregate({
                where: { ...baseWhere, type: 'IN', createdBy: userId },
                _sum: { amount: true }
            }),
            this.prisma.miscTransaction.aggregate({
                where: { ...baseWhere, type: 'OUT', createdBy: userId },
                _sum: { amount: true }
            }),
            this.prisma.cashAdjustment.aggregate({
                where: { ...baseWhere, createdBy: userId },
                _sum: { difference: true }
            })
        ]);

        const totalAmount = Number(salesAggregate._sum.totalAmount || 0);
        const miscRevenue = Number(miscInAggr._sum.amount || 0);
        const miscExpenses = Number(miscOutAggr._sum.amount || 0);
        const cashDifference = Number(cashDiffAggr._sum.difference || 0);

        const averageBasket = salesCount > 0 ? totalAmount / salesCount : 0;

        return {
            salesCount,
            totalAmount,
            miscRevenue,
            miscExpenses,
            cashDifference,
            itemsSold: itemsCount._sum.quantity || 0,
            averageBasket
        };
    }

    /**
     * Get maintenance statistics by user
     */
    async getUserMaintenanceStats(params: UserAnalyticsParams) {
        const { organizationId, userId, storeId, startDate, endDate } = params;

        const where: any = {
            createdAt: {
                gte: startDate,
                lte: endDate
            },
            ...(userId && { createdBy: userId }),
            ...(storeId && { storeId })
        };

        if (!userId) {
            const users = await this.prisma.user.findMany({
                where: { organizationId },
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
            });

            const userStats = await Promise.all(users.map(async (user) => {
                const [created, completed, revenueAggregate] = await Promise.all([
                    this.prisma.maintenance.count({
                        where: { ...where, createdBy: user.id }
                    }),
                    this.prisma.maintenance.count({
                        where: { ...where, createdBy: user.id, status: 'DONE' }
                    }),
                    this.prisma.maintenance.aggregate({
                        where: { ...where, createdBy: user.id, status: 'DONE' },
                        _sum: { totalCost: true }
                    })
                ]);

                const completionRate = created > 0 ? (completed / created) * 100 : 0;

                return {
                    user: {
                        id: user.id,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role
                    },
                    created,
                    completed,
                    revenue: Number(revenueAggregate._sum.totalCost || 0),
                    completionRate
                };
            }));

            return userStats.filter(stat => stat.created > 0);
        }

        // Single user stats
        const [created, completed, revenueAggregate] = await Promise.all([
            this.prisma.maintenance.count({ where }),
            this.prisma.maintenance.count({ where: { ...where, status: 'DONE' } }),
            this.prisma.maintenance.aggregate({
                where: { ...where, status: 'DONE' },
                _sum: { totalCost: true }
            })
        ]);

        const completionRate = created > 0 ? (completed / created) * 100 : 0;

        return {
            created,
            completed,
            revenue: Number(revenueAggregate._sum.totalCost || 0),
            completionRate
        };
    }

    /**
     * Get subscription statistics by user
     */
    async getUserSubscriptionStats(params: UserAnalyticsParams) {
        const { organizationId, userId, storeId, startDate, endDate } = params;

        const where: any = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };

        if (!userId) {
            const users = await this.prisma.user.findMany({
                where: { organizationId },
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
            });

            const userStats = await Promise.all(users.map(async (user) => {
                // Note: CustomerSubscription doesn't have createdBy field
                // But SubscriptionRenewal does track who processed the renewal
                const [subscriptionsCount, renewalsCount, renewalRevenue] = await Promise.all([
                    // Count all subscriptions in the period (can't filter by user)
                    this.prisma.customerSubscription.count({
                        where
                    }),
                    // Count renewals processed by this user
                    this.prisma.subscriptionRenewal.count({
                        where: { ...where, createdBy: user.id }
                    }),
                    // Sum revenue from renewals processed by this user
                    this.prisma.subscriptionRenewal.aggregate({
                        where: { ...where, createdBy: user.id },
                        _sum: { price: true }
                    })
                ]);

                return {
                    user: {
                        id: user.id,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role
                    },
                    subscriptionsCreated: subscriptionsCount,
                    renewalsProcessed: renewalsCount,
                    revenue: Number(renewalRevenue._sum.price || 0)
                };
            }));

            return userStats.filter(stat => stat.subscriptionsCreated > 0 || stat.renewalsProcessed > 0);
        }

        // Single user stats
        const [subscriptionsCount, renewalsCount, renewalRevenue] = await Promise.all([
            this.prisma.customerSubscription.count({ where }),
            this.prisma.subscriptionRenewal.count({ where }),
            this.prisma.subscriptionRenewal.aggregate({
                where,
                _sum: { price: true }
            })
        ]);

        return {
            subscriptionsCreated: subscriptionsCount,
            renewalsProcessed: renewalsCount,
            revenue: Number(renewalRevenue._sum.price || 0)
        };
    }

    /**
     * Get complete user dashboard
     */
    async getUserDashboard(params: PeriodParams) {
        const { organizationId, userId, storeId, period, startDate: customStart, endDate: customEnd } = params;

        const { startDate, endDate } = this.calculateDateRange(period, customStart, customEnd);

        const analyticsParams: UserAnalyticsParams = {
            organizationId,
            userId,
            storeId,
            startDate,
            endDate
        };

        const [sales, maintenances, subscriptions] = await Promise.all([
            this.getUserSalesStats(analyticsParams),
            this.getUserMaintenanceStats(analyticsParams),
            this.getUserSubscriptionStats(analyticsParams)
        ]);

        return {
            period: {
                type: period,
                startDate,
                endDate
            },
            sales,
            maintenances,
            subscriptions
        };
    }

    /**
     * Get user rankings
     */
    async getUserRankings(params: {
        organizationId: string;
        storeId?: string;
        metric?: 'sales' | 'maintenance' | 'subscriptions';
        startDate: Date;
        endDate: Date;
        limit?: number;
    }) {
        const { organizationId, storeId, metric, startDate, endDate, limit = 10 } = params;

        const analyticsParams: UserAnalyticsParams = {
            organizationId,
            storeId,
            startDate,
            endDate
        };

        // If no metric specified, return combined rankings with all data
        if (!metric) {
            const [salesStats, maintenanceStats, subscriptionStats] = await Promise.all([
                this.getUserSalesStats(analyticsParams) as Promise<any[]>,
                this.getUserMaintenanceStats(analyticsParams) as Promise<any[]>,
                this.getUserSubscriptionStats(analyticsParams) as Promise<any[]>
            ]);

            // Create a map to combine all stats by user
            const userStatsMap = new Map<string, any>();

            // Add sales stats
            salesStats.forEach((stat: any) => {
                const userId = stat.user.id;
                userStatsMap.set(userId, {
                    user: stat.user,
                    salesCount: stat.salesCount || 0,
                    salesRevenue: stat.totalAmount || 0,
                    miscRevenue: stat.miscRevenue || 0,
                    miscExpenses: stat.miscExpenses || 0,
                    cashDifference: stat.cashDifference || 0,
                    maintenancesCount: 0,
                    maintenanceRevenue: 0,
                    subscriptionsCount: 0,
                    subscriptionRevenue: 0,
                    totalRevenue: (stat.totalAmount || 0) + (stat.miscRevenue || 0) - (stat.miscExpenses || 0) + (stat.cashDifference || 0)
                });
            });

            // Add maintenance stats
            maintenanceStats.forEach((stat: any) => {
                const userId = stat.user.id;
                const existing = userStatsMap.get(userId);
                if (existing) {
                    existing.maintenancesCount = stat.created || 0;
                    existing.maintenanceRevenue = stat.revenue || 0;
                    existing.totalRevenue += stat.revenue || 0;
                } else {
                    userStatsMap.set(userId, {
                        user: stat.user,
                        salesCount: 0,
                        salesRevenue: 0,
                        miscRevenue: 0,
                        miscExpenses: 0,
                        cashDifference: 0,
                        maintenancesCount: stat.created || 0,
                        maintenanceRevenue: stat.revenue || 0,
                        subscriptionsCount: 0,
                        subscriptionRevenue: 0,
                        totalRevenue: stat.revenue || 0
                    });
                }
            });

            // Add subscription stats
            subscriptionStats.forEach((stat: any) => {
                const userId = stat.user.id;
                const existing = userStatsMap.get(userId);
                if (existing) {
                    existing.subscriptionsCount = stat.subscriptionsCreated || 0;
                    existing.subscriptionRevenue = stat.revenue || 0;
                    existing.totalRevenue += stat.revenue || 0;
                } else {
                    userStatsMap.set(userId, {
                        user: stat.user,
                        salesCount: 0,
                        salesRevenue: 0,
                        miscRevenue: 0,
                        miscExpenses: 0,
                        cashDifference: 0,
                        maintenancesCount: 0,
                        maintenanceRevenue: 0,
                        subscriptionsCount: stat.subscriptionsCreated || 0,
                        subscriptionRevenue: stat.revenue || 0,
                        totalRevenue: stat.revenue || 0
                    });
                }
            });

            // Convert map to array and sort by totalRevenue
            const rankings = Array.from(userStatsMap.values())
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, limit);

            return rankings;
        }

        // Original single-metric logic
        let rankings: any[] = [];

        switch (metric) {
            case 'sales':
                rankings = await this.getUserSalesStats(analyticsParams) as any[];
                rankings.sort((a, b) => b.totalAmount - a.totalAmount);
                break;
            case 'maintenance':
                rankings = await this.getUserMaintenanceStats(analyticsParams) as any[];
                rankings.sort((a, b) => b.revenue - a.revenue);
                break;
            case 'subscriptions':
                rankings = await this.getUserSubscriptionStats(analyticsParams) as any[];
                rankings.sort((a, b) => b.revenue - a.revenue);
                break;
        }

        return rankings.slice(0, limit);
    }
}
