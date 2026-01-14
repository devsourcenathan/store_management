import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GLOBAL_ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    async getGlobalStats() {
        return this.adminService.getGlobalStats();
    }

    @Get('organizations')
    async getOrganizations() {
        return this.adminService.getOrganizations();
    }

    @Get('organizations/:id')
    async getOrganization(@Param('id') id: string) {
        return this.adminService.getOrganization(id);
    }
}
