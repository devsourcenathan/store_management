import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        return this.prisma.user.findMany({
            where: {
                organizationId,
                isActive: true
            },
            include: {
                stores: {
                    include: {
                        store: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async findOne(id: string, organizationId: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                organizationId,
                isActive: true
            },
            include: {
                stores: true
            }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { passwordHash, ...result } = user;
        return result;
    }

    async create(data: any, organizationId: string) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const storeIds = data.storeIds || [];

        return this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role as UserRole,
                organizationId,
                stores: {
                    create: storeIds.map((storeId: string) => ({
                        storeId
                    }))
                }
            },
            include: {
                stores: {
                    include: { store: true }
                }
            }
        });
    }

    async update(id: string, data: any, organizationId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id, organizationId }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const updateData: any = {
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
        };

        if (data.password) {
            updateData.passwordHash = await bcrypt.hash(data.password, 10);
        }

        // Handle store assignments if provided
        if (data.storeIds) {
            // First delete existing assignments
            await this.prisma.userStore.deleteMany({
                where: { userId: id }
            });

            // Then create new ones is hard in one atomic update with simple prisma syntax without transaction or connect/create logic complexity
            // but we can use nested update
            // Ideally we separate this, but for simplicity let's do it in transaction or just simple updates
        }

        // Since we need to update relations, let's use transaction if storeIds present
        if (data.storeIds) {
            return this.prisma.$transaction(async (tx) => {
                await tx.userStore.deleteMany({
                    where: { userId: id }
                });

                if (data.storeIds.length > 0) {
                    await tx.userStore.createMany({
                        data: data.storeIds.map((storeId: string) => ({
                            userId: id,
                            storeId
                        }))
                    });
                }

                return tx.user.update({
                    where: { id },
                    data: updateData,
                    include: {
                        stores: { include: { store: true } }
                    }
                });
            });
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                stores: { include: { store: true } }
            }
        });
    }

    async remove(id: string, organizationId: string) {
        // Soft delete
        return this.prisma.user.update({
            where: { id },
            data: { isActive: false }
        });
    }
}
