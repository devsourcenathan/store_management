import { Injectable, Inject } from '@nestjs/common';
import { IAuditLogRepository } from './repositories/audit-log.repository.interface';
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
    constructor(
        @Inject('IAuditLogRepository') private repository: IAuditLogRepository,
        private prisma: PrismaService
    ) { }

    /**
     * Log an audit entry with comprehensive metadata
     */
    async log(params: AuditLogParams) {
        return this.repository.create(params);
    }

    /**
     * Get audit logs with advanced filtering
     */
    async getLogs(params: GetLogsParams) {
        const result = await this.repository.findMany(params);
        const logsWithUsers = await this.enrichLogsWithUsers(result.logs);

        return {
            ...result,
            logs: logsWithUsers
        };
    }

    /**
     * Get audit logs for a specific user
     */
    async getLogsByUser(userId: string, startDate?: Date, endDate?: Date, limit = 50) {
        const logs = await this.repository.getLogsByUser(userId, startDate, endDate, limit);
        return this.enrichLogsWithUsers(logs);
    }

    /**
     * Get audit logs for a specific entity
     */
    async getLogsByEntity(entity: string, entityId: string, limit = 50) {
        const logs = await this.repository.getLogsByEntity(entity, entityId, limit);
        return this.enrichLogsWithUsers(logs);
    }

    /**
     * Get audit statistics for an organization
     */
    async getAuditStats(organizationId: string, startDate?: Date, endDate?: Date) {
        return this.repository.getAuditStats(organizationId, startDate, endDate);
    }

    /**
     * Helper to enrich logs with user details from Prisma
     */
    private async enrichLogsWithUsers(logs: any[]) {
        if (!logs.length) return [];

        const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))];

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
            }
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        return logs.map(log => ({
            ...log,
            user: userMap.get(log.userId) || {
                id: log.userId,
                firstName: 'Unknown',
                lastName: 'User',
                email: '',
                role: 'STAFF'
            }
        }));
    }
}

