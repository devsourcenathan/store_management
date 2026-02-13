import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

export interface AuditLogParams {
    organizationId: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    changes?: any;
    method?: string;
    status?: string;
    duration?: number;
    ipAddress?: string;
    userAgent?: string;
}

export interface GetLogsParams {
    organizationId: string;
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export interface AuditLogWithUser {
    id: string;
    organizationId: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    changes?: any;
    method?: string | null;
    status: string;
    duration?: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: UserRole;
    };
}

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    /**
     * Log an audit entry with comprehensive metadata
     */
    async log(params: AuditLogParams) {
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

    /**
     * Get audit logs with advanced filtering
     */
    async getLogs(params: GetLogsParams) {
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

    /**
     * Get audit logs for a specific user
     */
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

    /**
     * Get audit logs for a specific entity
     */
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

    /**
     * Get audit statistics for an organization
     */
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
            // Total logs count
            this.prisma.auditLog.count({ where }),

            // Logs grouped by action
            this.prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } }
            }),

            // Logs grouped by entity
            this.prisma.auditLog.groupBy({
                by: ['entity'],
                where,
                _count: { entity: true },
                orderBy: { _count: { entity: 'desc' } }
            }),

            // Logs grouped by status
            this.prisma.auditLog.groupBy({
                by: ['status'],
                where,
                _count: { status: true }
            }),

            // Top users by activity
            this.prisma.auditLog.groupBy({
                by: ['userId'],
                where,
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                take: 10
            }),

            // Average duration
            this.prisma.auditLog.aggregate({
                where: {
                    ...where,
                    duration: { not: null }
                },
                _avg: { duration: true }
            })
        ]);

        // Fetch user details for top users
        const userIds = topUsers.map(u => u.userId);
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
            }
        });

        const topUsersWithDetails = topUsers.map(tu => ({
            user: users.find(u => u.id === tu.userId),
            count: tu._count.userId
        }));

        return {
            totalLogs,
            logsByAction: logsByAction.map(l => ({
                action: l.action,
                count: l._count.action
            })),
            logsByEntity: logsByEntity.map(l => ({
                entity: l.entity,
                count: l._count.entity
            })),
            logsByStatus: logsByStatus.map(l => ({
                status: l.status,
                count: l._count.status
            })),
            topUsers: topUsersWithDetails,
            avgDuration: avgDuration._avg.duration || 0
        };
    }
}

