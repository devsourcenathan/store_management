import { Controller, Get, Query, Req, UseGuards, Param, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditService, AuditLogWithUser } from './audit.service';
import { GetLogsDto, GetAuditStatsDto } from './dto/get-logs.dto';
import { Response } from 'express';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    /**
     * Get audit logs with filtering
     * Only accessible by OWNER and MANAGER
     */
    @Get('logs')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getLogs(@Query() query: GetLogsDto, @Req() req) {
        const organizationId = req.user.organizationId;

        return this.auditService.getLogs({
            organizationId,
            userId: query.userId,
            entity: query.entity,
            entityId: query.entityId,
            action: query.action,
            status: query.status,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            limit: query.limit,
            offset: query.offset
        });
    }

    /**
     * Get audit logs for a specific user
     */
    @Get('logs/user/:userId')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getLogsByUser(
        @Param('userId') userId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: number
    ) {
        return this.auditService.getLogsByUser(
            userId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
            limit
        );
    }

    /**
     * Get audit logs for a specific entity
     */
    @Get('logs/entity/:entity/:entityId')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getLogsByEntity(
        @Param('entity') entity: string,
        @Param('entityId') entityId: string,
        @Query('limit') limit?: number
    ) {
        return this.auditService.getLogsByEntity(entity, entityId, limit);
    }

    /**
     * Get audit statistics
     */
    @Get('stats')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getAuditStats(@Query() query: GetAuditStatsDto, @Req() req) {
        const organizationId = req.user.organizationId;

        return this.auditService.getAuditStats(
            organizationId,
            query.startDate ? new Date(query.startDate) : undefined,
            query.endDate ? new Date(query.endDate) : undefined
        );
    }

    /**
     * Export audit logs as CSV
     */
    @Get('export')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async exportLogs(
        @Query() query: GetLogsDto,
        @Req() req,
        @Res() res: Response
    ) {
        const organizationId = req.user.organizationId;

        const result = await this.auditService.getLogs({
            organizationId,
            userId: query.userId,
            entity: query.entity,
            entityId: query.entityId,
            action: query.action,
            status: query.status,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            limit: 10000, // Max export limit
            offset: 0
        });

        // Convert to CSV
        const csvRows = [];
        csvRows.push([
            'Date',
            'User',
            'Email',
            'Role',
            'Action',
            'Entity',
            'Entity ID',
            'Status',
            'Method',
            'Duration (ms)',
            'IP Address'
        ].join(','));

        result.logs.forEach((log: any) => {
            csvRows.push([
                log.createdAt.toISOString(),
                `${log.user.firstName} ${log.user.lastName}`,
                log.user.email,
                log.user.role,
                log.action,
                log.entity,
                log.entityId,
                log.status,
                log.method || '',
                log.duration || '',
                log.ipAddress || ''
            ].join(','));
        });

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(csv);
    }
}
