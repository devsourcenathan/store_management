import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        return this.prisma.product.findMany({
            where: { organizationId, isActive: true },
            include: {
                category: true,
                pricingRules: {
                    where: { isActive: true },
                    orderBy: { priority: 'desc' },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        return this.prisma.product.findFirst({
            where: { id, organizationId },
            include: {
                category: true,
                pricingRules: true,
            },
        });
    }

    async create(data: any, organizationId: string) {
        return this.prisma.product.create({
            data: {
                ...data,
                organizationId,
            },
            include: {
                category: true,
            },
        });
    }

    async update(id: string, data: any, organizationId: string) {
        return this.prisma.product.update({
            where: { id },
            data,
            include: {
                category: true,
            },
        });
    }

    async delete(id: string, organizationId: string) {
        // Soft delete
        return this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async findByCategory(categoryId: string, organizationId: string) {
        return this.prisma.product.findMany({
            where: { categoryId, organizationId, isActive: true },
            include: { category: true },
        });
    }

    // ============================================
    // CATEGORIES
    // ============================================

    async findAllCategories(organizationId: string) {
        return this.prisma.category.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { name: 'asc' },
        });
    }

    async createCategory(data: any, organizationId: string) {
        return this.prisma.category.create({
            data: {
                ...data,
                organizationId,
            },
        });
    }

    async updateCategory(id: string, data: any, organizationId: string) {
        return this.prisma.category.update({
            where: { id },
            data,
        });
    }

    async deleteCategory(id: string, organizationId: string) {
        return this.prisma.category.delete({
            where: { id },
        });
    }
}
