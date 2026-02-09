import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreAuthGuard } from '@/common/guards/store-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentOrganization } from '@/common/decorators/user.decorator';
import { UserRole, DeviceOwnerType } from '@prisma/client';

@Controller('devices')
@UseGuards(JwtAuthGuard, StoreAuthGuard)
export class DevicesController {
    constructor(private devicesService: DevicesService) { }

    @Get()
    async findAll(
        @CurrentOrganization() organizationId: string,
        @Query('ownerType') ownerType?: DeviceOwnerType,
        @Query('customerId') customerId?: string,
    ) {
        return this.devicesService.findAll(organizationId, { ownerType, customerId });
    }

    @Get('customer/:customerId')
    async findByCustomer(
        @Param('customerId') customerId: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.devicesService.findByCustomer(customerId, organizationId);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.devicesService.findOne(id, organizationId);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async create(
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.devicesService.create(data, organizationId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async update(
        @Param('id') id: string,
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.devicesService.update(id, data, organizationId);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async delete(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.devicesService.delete(id, organizationId);
    }
}
