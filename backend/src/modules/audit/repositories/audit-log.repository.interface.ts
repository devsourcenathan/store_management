import { AuditLogParams, GetLogsParams } from '../audit.service';
import { AuditLog } from '@prisma/client';

export interface AuditLogResult {
    logs: any[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface IAuditLogRepository {
    create(params: AuditLogParams): Promise<any>;
    findMany(params: GetLogsParams): Promise<AuditLogResult>;
    getLogsByUser(userId: string, startDate?: Date, endDate?: Date, limit?: number): Promise<any[]>;
    getLogsByEntity(entity: string, entityId: string, limit?: number): Promise<any[]>;
    count(params: any): Promise<number>;
    getAuditStats(organizationId: string, startDate?: Date, endDate?: Date): Promise<any>;
}
