import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MediaEntityType } from '@prisma/client';
import { GetProductsDto } from './dto/get-products.dto';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    // Perf Phase 1: bounded result set. When page/limit are provided ->
    // { data, meta } envelope. Otherwise legacy array (capped at 500)
    // for backward compatibility (POS loads full catalog).
    async findAll(organizationId: string, params?: GetProductsDto, storeId?: string) {
        const { search, categoryId, minPrice, maxPrice, sortBy = 'name', sortOrder = 'asc', page, limit } = params || {};
        const paginated = page !== undefined || limit !== undefined;
        const take = Math.min(Math.max(limit ?? 500, 1), 500);
        const skip = (Math.max(page ?? 1, 1) - 1) * take;

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

        const [total, products] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                // Perf Phase 1: lean selects instead of full category rows
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    description: true,
                    categoryId: true,
                    organizationId: true,
                    basePrice: true,
                    costPrice: true,
                    minStock: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    category: {
                        select: { id: true, name: true },
                    },
                    pricingRules: {
                        where: { isActive: true },
                        orderBy: { priority: 'desc' },
                    },
                },
                orderBy,
                take,
                ...(paginated ? { skip } : {}),
            }),
        ]);

        const productIds = products.map(p => p.id);
        const media = productIds.length
            ? await this.prisma.media.findMany({
                where: {
                    organizationId,
                    entityType: MediaEntityType.PRODUCT,
                    entityId: { in: productIds },
                },
                // Perf Phase 1: only fields the frontend renders
                select: {
                    id: true,
                    entityId: true,
                    url: true,
                    thumbnailUrl: true,
                    filename: true,
                },
            })
            : [];

        const mediaByProduct = new Map<string, typeof media>();
        for (const m of media) {
            const list = mediaByProduct.get(m.entityId);
            if (list) list.push(m);
            else mediaByProduct.set(m.entityId, [m]);
        }

        const data = products.map(p => ({
            ...p,
            media: mediaByProduct.get(p.id) ?? [],
        }));

        if (!paginated) return data;

        return {
            data,
            meta: {
                total,
                page: Math.max(page ?? 1, 1),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        };
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
        const { storeId, ...categoryData } = data;
        return this.prisma.category.update({
            where: { id },
            data: categoryData,
        });
    }

    async deleteCategory(id: string, organizationId: string) {
        return this.prisma.category.delete({
            where: { id },
        });
    }
}
