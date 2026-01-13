import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        return this.prisma.customer.findMany({
            where: { organizationId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        return this.prisma.customer.findFirst({
            where: { id, organizationId },
        });
    }

    async create(data: any, organizationId: string) {
        return this.prisma.customer.create({
            data: {
                ...data,
                organizationId,
            },
        });
    }

    async update(id: string, data: any, organizationId: string) {
        return this.prisma.customer.update({
            where: { id },
            data,
        });
    }

    async delete(id: string, organizationId: string) {
        return this.prisma.customer.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
