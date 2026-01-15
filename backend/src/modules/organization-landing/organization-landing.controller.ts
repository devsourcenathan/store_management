import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { OrganizationLandingService } from './organization-landing.service';
import { UpdateOrgLandingDto } from './dto/update-org-landing.dto';
import { ImportSiteDto } from './dto/import-site.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UserRole } from '@prisma/client';

import { AuditService } from '../audit/audit.service';

@Controller('org-landing')
export class OrganizationLandingController {
    constructor(
        private readonly service: OrganizationLandingService,
        private readonly auditService: AuditService,
    ) { }

    @Public()
    @Get('subdomain/:subdomain')
    async getBySubdomain(@Param('subdomain') subdomain: string) {
        return this.service.getBySubdomain(subdomain);
    }

    @Public()
    @Get('public/:orgId')
    async getPublicByOrgId(@Param('orgId') orgId: string) {
        return this.service.getByOrgId(orgId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    @Put('me')
    async update(@CurrentUser() user: any, @Body() dto: UpdateOrgLandingDto) {
        return this.service.upsert(user.organizationId, dto, user.id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    @Get('audit')
    async getAuditLogs(@CurrentUser() user: any) {
        return this.auditService.getLogs(user.organizationId, 'OrganizationLanding');
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    @Get('verify-domain')
    async verifyDomain(@Query('domain') domain: string) {
        const dns = require('dns').promises;
        try {
            const records = await dns.resolveCname(domain);
            const verified = records.includes('domains.stock-app.com');
            return {
                verified,
                message: verified
                    ? 'Domain verified successfully'
                    : 'CNAME record does not point to domains.stock-app.com'
            };
        } catch (error: any) {
            let message = 'Failed to resolve DNS records';

            if (error.code === 'ENODATA') {
                message = 'Domain exists but no CNAME record found. Please ensure you have added a CNAME record pointing to domains.stock-app.com';
            } else if (error.code === 'ENOTFOUND') {
                message = 'Domain not found. Please check the spelling and ensure the domain is registered.';
            } else if (error.message) {
                message += ': ' + error.message;
            }

            return {
                verified: false,
                message
            };
        }
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    @Post('import')
    async importSite(@CurrentUser() user: any, @Body() dto: ImportSiteDto) {
        return this.service.importSite(user.organizationId, dto, user.id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    @Get('export')
    async exportSite(@CurrentUser() user: any) {
        return this.service.exportSite(user.organizationId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    @Post('toggle-mode')
    async toggleEditMode(@CurrentUser() user: any, @Body('mode') mode: 'visual' | 'code') {
        return this.service.toggleEditMode(user.organizationId, mode, user.id);
    }
}
