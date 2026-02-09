import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DeviceOwnerType } from '@prisma/client';

@Injectable()
export class DevicesService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string, filters?: { ownerType?: DeviceOwnerType; customerId?: string }) {
        const where: any = { organizationId, isActive: true };

        if (filters?.ownerType) {
            where.ownerType = filters.ownerType;
        }

        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }

        return this.prisma.device.findMany({
            where,
            include: {
                customer: true,
                _count: {
                    select: { maintenances: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        return this.prisma.device.findFirst({
            where: { id, organizationId },
            include: {
                customer: true,
                maintenances: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        parts: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            },
        });
    }

    async create(data: any, organizationId: string) {
        return this.prisma.device.create({
            data: {
                ...data,
                organizationId,
            },
            include: {
                customer: true,
            },
        });
    }

    async update(id: string, data: any, organizationId: string) {
        return this.prisma.device.update({
            where: { id },
            data,
            include: {
                customer: true,
            },
        });
    }

    async delete(id: string, organizationId: string) {
        // Soft delete
        return this.prisma.device.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async findByCustomer(customerId: string, organizationId: string) {
        return this.prisma.device.findMany({
            where: { customerId, organizationId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
}
