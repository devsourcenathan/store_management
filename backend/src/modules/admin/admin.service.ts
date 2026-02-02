import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getGlobalStats() {
        // 1. Fetch current totals
        const [
            totalOrganizations,
            totalStores,
            totalUsers,
            totalProducts,
            totalSalesCount,
        ] = await Promise.all([
            this.prisma.organization.count(),
            this.prisma.store.count(),
            this.prisma.user.count(),
            this.prisma.product.count(),
            this.prisma.sale.count(),
        ]);

        // 2. Calculate trends (Last 6 months)
        const months = Array.from({ length: 6 }).map((_, i) => {
            const date = subMonths(new Date(), i);
            return {
                start: startOfMonth(date),
                end: endOfMonth(date),
                label: format(date, 'MMM yyyy'), // e.g., "Jan 2024"
            };
        }).reverse();

        // Helper to get counts by month
        const getTrendData = async (model: any, dateField: string = 'createdAt') => {
            return Promise.all(
                months.map(async (month) => {
                    const count = await model.count({
                        where: {
                            [dateField]: {
                                gte: month.start,
                                lte: month.end,
                            },
                        },
                    });
                    return { name: month.label, value: count };
                })
            );
        };

        // Helper for Sales Volume (Sum totalAmount)
        const getSalesVolumeData = async () => {
            return Promise.all(
                months.map(async (month) => {
                    const aggregate = await this.prisma.sale.aggregate({
                        _sum: { totalAmount: true },
                        where: {
                            createdAt: {
                                gte: month.start,
                                lte: month.end,
                            },
                        },
                    });
                    return { name: month.label, value: Number(aggregate._sum.totalAmount) || 0 };
                })
            );
        };

        const [userGrowth, storeGrowth, salesTrend, salesVolume] = await Promise.all([
            getTrendData(this.prisma.user),
            getTrendData(this.prisma.store),
            getTrendData(this.prisma.sale),
            getSalesVolumeData(),
        ]);

        return {
            totalOrganizations,
            totalStores,
            totalUsers,
            totalProducts,
            totalSalesCount,
            trends: {
                userGrowth,
                storeGrowth,
                salesTrend,
                salesVolume,
            },
        };
    }

    async getOrganizations() {
        return this.prisma.organization.findMany({
            include: {
                _count: {
                    select: { stores: true, users: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getOrganization(id: string) {
        return this.prisma.organization.findUnique({
            where: { id },
            include: {
                users: true,
                stores: true,
                landingPage: true,
            },
        });
    }

    // Additional CRUD if needed
}
