import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MediaEntityType } from '@prisma/client';
import { GetProductsDto } from './dto/get-products.dto';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string, params?: GetProductsDto, storeId?: string) {
        const { search, categoryId, minPrice, maxPrice, sortBy = 'name', sortOrder = 'asc' } = params || {};

        const where: any = {
            organizationId,
            isActive: true,
        };

        // Exclude products deleted in the current store
        if (storeId) {
            where.deletedInStores = {
                none: { storeId }
            };
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.basePrice = {};
            if (minPrice !== undefined) where.basePrice.gte = minPrice;
            if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
        }

        const orderBy: any = {};
        if (sortBy) {
            orderBy[sortBy] = sortOrder;
        }

        const products = await this.prisma.product.findMany({
            where,
            include: {
                category: true,
                pricingRules: {
                    where: { isActive: true },
                    orderBy: { priority: 'desc' },
                },
            },
            orderBy,
        });

        const productIds = products.map(p => p.id);
        const media = await this.prisma.media.findMany({
            where: {
                organizationId,
                entityType: MediaEntityType.PRODUCT,
                entityId: { in: productIds },
            },
        });

        return products.map(p => ({
            ...p,
            media: media.filter(m => m.entityId === p.id),
        }));
    }

    async findOne(id: string, organizationId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id, organizationId },
            include: {
                category: true,
                pricingRules: true,
            },
        });

        if (!product) return null;

        const media = await this.prisma.media.findMany({
            where: {
                organizationId,
                entityType: MediaEntityType.PRODUCT,
                entityId: id,
            },
        });

        return { ...product, media };
    }

    async create(data: any, organizationId: string, userId: string) {
        const { initialStock, storeId, ...productData } = data;

        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    ...productData,
                    organizationId,
                },
                include: {
                    category: true,
                },
            });

            if (initialStock && initialStock > 0 && storeId) {
                await tx.stockMovement.create({
                    data: {
                        productId: product.id,
                        storeId: storeId,
                        type: 'IN', // Using string directly or import enum. Let's rely on string if enum import is tricky, but preferably import.
                        source: 'MANUAL',
                        quantity: Number(initialStock),
                        notes: 'Initial Stock',
                        createdBy: userId,
                    },
                });
            }

            return product;
        });
    }

    async update(id: string, data: any, organizationId: string) {
        // Remove fields that don't exist in Product model
        const { initialStock, storeId, ...updateData } = data;

        return this.prisma.product.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
            },
        });
    }

    async softDelete(id: string, storeId: string, userId: string) {
        // Create a deleted product record for this store
        return this.prisma.deletedProduct.create({
            data: {
                productId: id,
                storeId,
                deletedBy: userId,
            },
        });
    }

    async restore(id: string, storeId: string) {
        // Remove the deleted product record for this store
        return this.prisma.deletedProduct.delete({
            where: {
                productId_storeId: {
                    productId: id,
                    storeId,
                },
            },
        });
    }

    async findDeleted(organizationId: string, storeId: string) {
        // Find products that are deleted in this specific store
        const products = await this.prisma.product.findMany({
            where: {
                organizationId,
                deletedInStores: {
                    some: { storeId },
                },
            },
            include: {
                category: true,
                deletedInStores: {
                    where: { storeId },
                    select: {
                        deletedAt: true,
                        deletedBy: true,
                    },
                },
            },
        });

        const productIds = products.map(p => p.id);
        const media = await this.prisma.media.findMany({
            where: {
                organizationId,
                entityType: MediaEntityType.PRODUCT,
                entityId: { in: productIds },
            },
        });

        return products.map(p => ({
            ...p,
            media: media.filter(m => m.entityId === p.id),
        }));
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
        const { storeId, ...categoryData } = data;
        return this.prisma.category.create({
            data: {
                ...categoryData,
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
