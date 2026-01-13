import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class StoresService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        return this.prisma.store.findMany({
            where: { organizationId },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        const store = await this.prisma.store.findUnique({
            where: { id }
        });
        if (!store) throw new NotFoundException('Store not found');
        return store;
    }

    async create(data: any, organizationId: string, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            // Create the store
            const store = await tx.store.create({
                data: {
                    ...data,
                    organizationId
                }
            });

            // Automatically link the creating user to this store
            await tx.userStore.create({
                data: {
                    userId,
                    storeId: store.id
                }
            });

            return store;
        });
    }

    async update(id: string, data: any) {
        const { name, address } = data;

        return this.prisma.store.update({
            where: { id },
            data: {
                name,
                address
            }
        });
    }

    async remove(id: string) {
        return this.prisma.store.delete({
            where: { id }
        });
    }
}
