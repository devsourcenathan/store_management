import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    UseGuards,
    Request,
    ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsService } from './permissions.service';
import { UserRole } from '@prisma/client';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) { }

    /**
     * Get all available permissions
     */
    @Get()
    async getAllPermissions() {
        return this.permissionsService.getAllPermissions();
    }

    /**
     * Get current user's effective permissions
     */
    @Get('my')
    async getMyPermissions(@Request() req) {
        return this.permissionsService.getUserPermissions(req.user.id);
    }

    /**
     * Get role permissions for a specific role (OWNER only)
     */
    @Get('roles/:role')
    async getRolePermissions(@Request() req, @Param('role') role: UserRole) {
        if (req.user.role !== UserRole.OWNER) {
            throw new ForbiddenException('Only OWNER can view role permissions');
        }

        return this.permissionsService.getRolePermissions(
            req.user.organizationId,
            role
        );
    }

    /**
     * Update role permissions (OWNER only)
     */
    @Patch('roles/:role')
    async updateRolePermissions(
        @Request() req,
        @Param('role') role: UserRole,
        @Body() body: { permissions: { resource: string; canAccess: boolean }[] }
    ) {
        if (req.user.role !== UserRole.OWNER) {
            throw new ForbiddenException('Only OWNER can update role permissions');
        }

        return this.permissionsService.updateRolePermissions(
            req.user.organizationId,
            role,
            body.permissions
        );
    }

    /**
     * Get user-specific permission overrides (OWNER only)
     */
    @Get('users/:userId')
    async getUserPermissions(@Request() req, @Param('userId') userId: string) {
        if (req.user.role !== UserRole.OWNER) {
            throw new ForbiddenException('Only OWNER can view user permissions');
        }

        return this.permissionsService.getUserPermissionOverrides(userId);
    }

    /**
     * Update user-specific permissions (OWNER only)
     */
    @Patch('users/:userId')
    async updateUserPermissions(
        @Request() req,
        @Param('userId') userId: string,
        @Body() body: { permissions: { resource: string; canAccess: boolean }[] }
    ) {
        if (req.user.role !== UserRole.OWNER) {
            throw new ForbiddenException('Only OWNER can update user permissions');
        }

        return this.permissionsService.updateUserPermissions(
            userId,
            body.permissions
        );
    }
}
