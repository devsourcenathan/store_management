import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentOrganization } from '@/common/decorators/user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async findAll(@CurrentOrganization() organizationId: string) {
        return this.usersService.findAll(organizationId);
    }

    @Get(':id')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async findOne(@Param('id') id: string, @CurrentOrganization() organizationId: string) {
        return this.usersService.findOne(id, organizationId);
    }

    @Post()
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async create(@Body() data: any, @CurrentOrganization() organizationId: string) {
        return this.usersService.create(data, organizationId);
    }

    @Patch(':id')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async update(
        @Param('id') id: string,
        @Body() data: any,
        @CurrentOrganization() organizationId: string
    ) {
        return this.usersService.update(id, data, organizationId);
    }

    @Patch(':id/toggle-status')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async toggleStatus(
        @Param('id') id: string,
        @Request() req: any,
        @CurrentOrganization() organizationId: string
    ) {
        return this.usersService.toggleUserStatus(id, req.user.id, organizationId);
    }

    @Patch(':id/reset-password')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async resetPassword(
        @Param('id') id: string,
        @Body() data: { newPassword: string },
        @Request() req: any,
        @CurrentOrganization() organizationId: string
    ) {
        return this.usersService.resetUserPassword(id, data.newPassword, req.user.id, organizationId);
    }

    @Delete(':id')
    @Roles(UserRole.OWNER)
    async remove(@Param('id') id: string, @CurrentOrganization() organizationId: string) {
        return this.usersService.remove(id, organizationId);
    }
}
