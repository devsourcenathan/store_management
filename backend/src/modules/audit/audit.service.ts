import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(
        organizationId: string,
        userId: string,
        action: string,
        entity: string,
        entityId: string,
        changes?: any,
        ipAddress?: string,
        userAgent?: string,
    ) {
        return this.prisma.auditLog.create({
            data: {
                organizationId,
                userId,
                action,
                entity,
                entityId,
                changes: changes || {},
                ipAddress,
                userAgent,
            },
        });
    }

    async getLogs(organizationId: string, entity?: string, entityId?: string, limit = 50) {
        return this.prisma.auditLog.findMany({
            where: {
                organizationId,
                ...(entity && { entity }),
                ...(entityId && { entityId }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            }
        });
    }
}
