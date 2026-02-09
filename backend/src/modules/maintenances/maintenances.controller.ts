import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { MaintenancesService } from './maintenances.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreAuthGuard } from '@/common/guards/store-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentOrganization, CurrentUser } from '@/common/decorators/user.decorator';
import { UserRole, MaintenanceStatus, MaintenanceType } from '@prisma/client';

@Controller('maintenances')
@UseGuards(JwtAuthGuard, StoreAuthGuard)
export class MaintenancesController {
    constructor(private maintenancesService: MaintenancesService) { }

    @Get()
    async findAll(
        @CurrentOrganization() organizationId: string,
        @Query('status') status?: MaintenanceStatus,
        @Query('type') type?: MaintenanceType,
        @Query('customerId') customerId?: string,
        @Query('storeId') storeId?: string,
    ) {
        return this.maintenancesService.findAll(organizationId, { status, type, customerId, storeId });
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.maintenancesService.findOne(id, organizationId);
    }

    @Get(':id/cost')
    async calculateCost(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.maintenancesService.calculateCost(id, organizationId);
    }

    @Post()
    async create(
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
        @CurrentUser() user: any,
    ) {
        return this.maintenancesService.create(data, organizationId, user.id);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async update(
        @Param('id') id: string,
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.maintenancesService.update(id, data, organizationId);
    }

    @Patch(':id/complete')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async complete(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
        @CurrentUser() user: any,
    ) {
        return this.maintenancesService.complete(id, user.id, organizationId);
    }

    @Patch(':id/cancel')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async cancel(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.maintenancesService.cancel(id, organizationId);
    }
}
