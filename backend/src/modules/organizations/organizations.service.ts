import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class OrganizationsService {
    constructor(private prisma: PrismaService) { }

    async findOne(id: string) {
        return this.prisma.organization.findUnique({
            where: { id },
            include: {
                stores: true,
                users: true,
            },
        });
    }

    async update(id: string, data: any) {
        return this.prisma.organization.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                website: data.website,
                taxId: data.taxId,
                logoUrl: data.logoUrl,
                footer: data.footer,
            },
        });
    }
}
