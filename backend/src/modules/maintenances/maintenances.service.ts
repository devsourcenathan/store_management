import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MaintenanceStatus, MaintenanceType } from '@prisma/client';

@Injectable()
export class MaintenancesService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string, filters?: { status?: MaintenanceStatus; type?: MaintenanceType; customerId?: string; storeId?: string }) {
        const where: any = { organizationId };

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }

        if (filters?.storeId) {
            where.storeId = filters.storeId;
        }

        return this.prisma.maintenance.findMany({
            where,
            include: {
                device: {
                    include: {
                        customer: true
                    }
                },
                customer: true,
                parts: {
                    include: {
                        product: true
                    }
                },
                _count: {
                    select: { parts: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const maintenance = await this.prisma.maintenance.findFirst({
            where: { id, organizationId },
            include: {
                device: {
                    include: {
                        customer: true
                    }
                },
                customer: true,
                parts: {
                    include: {
                        product: true
                    }
                },
                invoice: true,
            },
        });

        if (!maintenance) {
            throw new NotFoundException('Maintenance not found');
        }

        return maintenance;
    }

    async create(data: any, organizationId: string, userId: string) {
        const { parts, ...maintenanceData } = data;

        return this.prisma.$transaction(async (tx) => {
            // Create maintenance
            const maintenance = await tx.maintenance.create({
                data: {
                    ...maintenanceData,
                    organizationId,
                    createdBy: userId,
                },
            });

            // Create parts if provided
            if (parts && parts.length > 0) {
                await tx.maintenancePart.createMany({
                    data: parts.map((part: any) => ({
                        maintenanceId: maintenance.id,
                        productId: part.productId,
                        quantity: part.quantity,
                        unitPrice: part.unitPrice,
                        total: part.quantity * part.unitPrice,
                    })),
                });
            }

            // Calculate and update total cost
            const totalCost = await this.calculateMaintenanceCost(tx, maintenance.id);
            await tx.maintenance.update({
                where: { id: maintenance.id },
                data: { totalCost },
            });

            return tx.maintenance.findUnique({
                where: { id: maintenance.id },
                include: {
                    device: { include: { customer: true } },
                    customer: true,
                    parts: { include: { product: true } },
                },
            });
        });
    }

    async update(id: string, data: any, organizationId: string) {
        const maintenance = await this.prisma.maintenance.findFirst({
            where: { id, organizationId },
        });

        if (!maintenance) {
            throw new NotFoundException('Maintenance not found');
        }

        if (maintenance.status === 'DONE') {
            throw new BadRequestException('Cannot modify a completed maintenance');
        }

        const { parts, ...updateData } = data;

        return this.prisma.$transaction(async (tx) => {
            // Update maintenance
            await tx.maintenance.update({
                where: { id },
                data: updateData,
            });

            // Update parts if provided
            if (parts) {
                // Delete existing parts
                await tx.maintenancePart.deleteMany({
                    where: { maintenanceId: id },
                });

                // Create new parts
                if (parts.length > 0) {
                    await tx.maintenancePart.createMany({
                        data: parts.map((part: any) => ({
                            maintenanceId: id,
                            productId: part.productId,
                            quantity: part.quantity,
                            unitPrice: part.unitPrice,
                            total: part.quantity * part.unitPrice,
                        })),
                    });
                }
            }

            // Recalculate total cost
            const totalCost = await this.calculateMaintenanceCost(tx, id);
            await tx.maintenance.update({
                where: { id },
                data: { totalCost },
            });

            return tx.maintenance.findUnique({
                where: { id },
                include: {
                    device: { include: { customer: true } },
                    customer: true,
                    parts: { include: { product: true } },
                },
            });
        });
    }

    async complete(id: string, userId: string, organizationId: string) {
        const maintenance = await this.prisma.maintenance.findFirst({
            where: { id, organizationId },
            include: { parts: true },
        });

        if (!maintenance) {
            throw new NotFoundException('Maintenance not found');
        }

        if (maintenance.status === 'DONE') {
            throw new BadRequestException('Maintenance already completed');
        }

        return this.prisma.$transaction(async (tx) => {
            // Create stock movements for each part
            for (const part of maintenance.parts) {
                await tx.stockMovement.create({
                    data: {
                        productId: part.productId,
                        storeId: maintenance.storeId,
                        type: 'OUT',
                        source: 'MANUAL',
                        quantity: part.quantity, // Positive quantity for OUT type
                        reference: maintenance.id,
                        notes: `Maintenance ${maintenance.type}: ${maintenance.description}`,
                        createdBy: userId,
                    },
                });
            }

            // Update maintenance status
            return tx.maintenance.update({
                where: { id },
                data: {
                    status: 'DONE',
                    completedBy: userId,
                    completedAt: new Date(),
                },
                include: {
                    device: { include: { customer: true } },
                    customer: true,
                    parts: { include: { product: true } },
                },
            });
        });
    }

    async cancel(id: string, organizationId: string) {
        const maintenance = await this.prisma.maintenance.findFirst({
            where: { id, organizationId },
        });

        if (!maintenance) {
            throw new NotFoundException('Maintenance not found');
        }

        if (maintenance.status === 'DONE') {
            throw new BadRequestException('Cannot cancel a completed maintenance');
        }

        return this.prisma.maintenance.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: {
                device: { include: { customer: true } },
                customer: true,
                parts: { include: { product: true } },
            },
        });
    }

    async calculateCost(id: string, organizationId: string) {
        const maintenance = await this.prisma.maintenance.findFirst({
            where: { id, organizationId },
            include: { parts: true },
        });

        if (!maintenance) {
            throw new NotFoundException('Maintenance not found');
        }

        const partsCost = maintenance.parts.reduce(
            (sum, part) => sum + Number(part.total),
            0
        );

        return {
            laborCost: Number(maintenance.laborCost),
            partsCost,
            totalCost: Number(maintenance.laborCost) + partsCost,
        };
    }

    private async calculateMaintenanceCost(tx: any, maintenanceId: string): Promise<number> {
        const maintenance = await tx.maintenance.findUnique({
            where: { id: maintenanceId },
            include: { parts: true },
        });

        const partsCost = maintenance.parts.reduce(
            (sum: number, part: any) => sum + Number(part.total),
            0
        );

        return Number(maintenance.laborCost) + partsCost;
    }
}
