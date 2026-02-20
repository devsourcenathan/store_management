import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        return this.prisma.supplier.findMany({
            where: { organizationId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        return this.prisma.supplier.findFirst({
            where: { id, organizationId },
        });
    }

    async create(data: any, organizationId: string) {
        const { storeId, ...supplierData } = data;
        return this.prisma.supplier.create({
            data: {
                ...supplierData,
                organizationId,
            },
        });
    }

    async update(id: string, data: any, organizationId: string) {
        const { storeId, ...supplierData } = data;
        return this.prisma.supplier.update({
            where: { id },
            data: supplierData,
        });
    }

    async delete(id: string, organizationId: string) {
        // Soft delete
        return this.prisma.supplier.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
