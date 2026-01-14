import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getGlobalStats() {
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

        // Calculate total sales amount (might be heavy, maybe just a sum for now or skip)
        // const salesAggregation = await this.prisma.sale.aggregate({
        //     _sum: { totalAmount: true },
        // });

        return {
            totalOrganizations,
            totalStores,
            totalUsers,
            totalProducts,
            totalSalesCount,
            // totalSalesAmount: salesAggregation._sum.totalAmount || 0,
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
