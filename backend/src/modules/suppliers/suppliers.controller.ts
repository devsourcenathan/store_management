import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentOrganization } from '@/common/decorators/user.decorator';
import { UserRole } from '@prisma/client';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
    constructor(private suppliersService: SuppliersService) { }

    @Get()
    async findAll(@CurrentOrganization() organizationId: string) {
        return this.suppliersService.findAll(organizationId);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.suppliersService.findOne(id, organizationId);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async create(
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.suppliersService.create(data, organizationId);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async update(
        @Param('id') id: string,
        @Body() data: any,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.suppliersService.update(id, data, organizationId);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async delete(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.suppliersService.delete(id, organizationId);
    }
}
