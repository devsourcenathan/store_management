import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditLogParams, GetLogsParams } from '../audit.service';
import { IAuditLogRepository, AuditLogResult } from './audit-log.repository.interface';

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
    constructor(private prisma: PrismaService) { }

    async create(params: AuditLogParams) {
        return this.prisma.auditLog.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                changes: params.changes || {},
                method: params.method,
                status: params.status || 'SUCCESS',
                duration: params.duration,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            },
        });
    }

    async findMany(params: GetLogsParams): Promise<AuditLogResult> {
        const {
            organizationId,
            userId,
            entity,
            entityId,
            action,
            status,
            startDate,
            endDate,
            limit = 50,
            offset = 0
        } = params;

        const where: any = {
            organizationId,
            ...(userId && { userId }),
            ...(entity && { entity }),
            ...(entityId && { entityId }),
            ...(action && { action }),
            ...(status && { status }),
        };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                // We keep the include here for backward compatibility if we use this repo directly
                // but strictly speaking the service should handle hydration if we want to be pure
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                        }
                    }
                }
            }),
            this.prisma.auditLog.count({ where })
        ]);

        return {
            logs,
            total,
            limit,
            offset,
            hasMore: offset + logs.length < total
        };
    }

    async getLogsByUser(userId: string, startDate?: Date, endDate?: Date, limit = 50) {
        const where: any = { userId };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        return this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    }
                }
            }
        });
    }

    async getLogsByEntity(entity: string, entityId: string, limit = 50) {
        return this.prisma.auditLog.findMany({
            where: {
                entity,
                entityId
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    }
                }
            }
        });
    }

    async count(params: any): Promise<number> {
        return this.prisma.auditLog.count({ where: params });
    }

    async getAuditStats(organizationId: string, startDate?: Date, endDate?: Date) {
        const where: any = { organizationId };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [
            totalLogs,
            logsByAction,
            logsByEntity,
            logsByStatus,
            topUsers,
            avgDuration
        ] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } }
            }),
            this.prisma.auditLog.groupBy({
                by: ['entity'],
                where,
                _count: { entity: true },
                orderBy: { _count: { entity: 'desc' } }
            }),
            this.prisma.auditLog.groupBy({
                by: ['status'],
                where,
                _count: { status: true }
            }),
            this.prisma.auditLog.groupBy({
                by: ['userId'],
                where,
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                take: 10
            }),
            this.prisma.auditLog.aggregate({
                where: {
                    ...where,
                    duration: { not: null }
                },
                _avg: { duration: true }
            })
        ]);

        return {
            totalLogs,
            logsByAction,
            logsByEntity,
            logsByStatus,
            topUsers,
            avgDuration
        };
    }
}
