import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class PermissionsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get all available permissions
     */
    async getAllPermissions() {
        return this.prisma.permission.findMany({
            orderBy: [
                { category: 'asc' },
                { name: 'asc' }
            ]
        });
    }

    /**
     * Get effective permissions for a user
     * Resolution order:
     * 1. OWNER → Full access
     * 2. GLOBAL_ADMIN → Admin panel only
     * 3. UserPermission override → Use override
     * 4. RolePermission → Use role permission
     * 5. Default → No access
     */
    async getUserPermissions(userId: string): Promise<Record<string, boolean>> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userPermissions: {
                    include: { permission: true }
                }
            }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // OWNER has full access
        if (user.role === UserRole.OWNER) {
            const allPermissions = await this.getAllPermissions();
            return allPermissions.reduce((acc, perm) => {
                acc[perm.resource] = true;
                return acc;
            }, {} as Record<string, boolean>);
        }

        // GLOBAL_ADMIN only has admin panel access
        if (user.role === UserRole.GLOBAL_ADMIN) {
            return { admin: true };
        }

        // Get all permissions
        const allPermissions = await this.getAllPermissions();
        const permissions: Record<string, boolean> = {};

        // Get role permissions for this organization
        const rolePermissions = await this.prisma.rolePermission.findMany({
            where: {
                organizationId: user.organizationId,
                role: user.role
            },
            include: { permission: true }
        });

        // Build permissions map from role permissions
        const rolePermMap = new Map(
            rolePermissions.map(rp => [rp.permission.resource, rp.canAccess])
        );

        // Build permissions map from user overrides
        const userPermMap = new Map(
            user.userPermissions.map(up => [up.permission.resource, up.canAccess])
        );

        // Resolve permissions
        for (const permission of allPermissions) {
            // Check user override first
            if (userPermMap.has(permission.resource)) {
                permissions[permission.resource] = userPermMap.get(permission.resource)!;
            }
            // Then check role permission
            else if (rolePermMap.has(permission.resource)) {
                permissions[permission.resource] = rolePermMap.get(permission.resource)!;
            }
            // Default to no access
            else {
                permissions[permission.resource] = false;
            }
        }

        return permissions;
    }

    /**
     * Get role permissions for a specific role in an organization
     */
    async getRolePermissions(organizationId: string, role: UserRole) {
        const rolePermissions = await this.prisma.rolePermission.findMany({
            where: {
                organizationId,
                role
            },
            include: { permission: true }
        });

        return rolePermissions.map(rp => ({
            resource: rp.permission.resource,
            name: rp.permission.name,
            category: rp.permission.category,
            canAccess: rp.canAccess
        }));
    }

    /**
     * Update role permissions for an organization (OWNER only)
     */
    async updateRolePermissions(
        organizationId: string,
        role: UserRole,
        permissions: { resource: string; canAccess: boolean }[]
    ) {
        // Get all permissions
        const allPermissions = await this.getAllPermissions();
        const permissionMap = new Map(allPermissions.map(p => [p.resource, p]));

        // Update or create role permissions
        for (const { resource, canAccess } of permissions) {
            const permission = permissionMap.get(resource);
            if (!permission) continue;

            await this.prisma.rolePermission.upsert({
                where: {
                    organizationId_role_permissionId: {
                        organizationId,
                        role,
                        permissionId: permission.id
                    }
                },
                update: { canAccess },
                create: {
                    organizationId,
                    role,
                    permissionId: permission.id,
                    canAccess
                }
            });
        }

        return this.getRolePermissions(organizationId, role);
    }

    /**
     * Get user-specific permission overrides
     */
    async getUserPermissionOverrides(userId: string) {
        const userPermissions = await this.prisma.userPermission.findMany({
            where: { userId },
            include: { permission: true }
        });

        return userPermissions.map(up => ({
            resource: up.permission.resource,
            name: up.permission.name,
            category: up.permission.category,
            canAccess: up.canAccess
        }));
    }

    /**
     * Update user-specific permission overrides (OWNER only)
     */
    async updateUserPermissions(
        userId: string,
        permissions: { resource: string; canAccess: boolean }[]
    ) {
        // Get all permissions
        const allPermissions = await this.getAllPermissions();
        const permissionMap = new Map(allPermissions.map(p => [p.resource, p]));

        // Update or create user permissions
        for (const { resource, canAccess } of permissions) {
            const permission = permissionMap.get(resource);
            if (!permission) continue;

            await this.prisma.userPermission.upsert({
                where: {
                    userId_permissionId: {
                        userId,
                        permissionId: permission.id
                    }
                },
                update: { canAccess },
                create: {
                    userId,
                    permissionId: permission.id,
                    canAccess
                }
            });
        }

        return this.getUserPermissionOverrides(userId);
    }

    /**
     * Check if a user has access to a specific resource
     */
    async hasPermission(userId: string, resource: string): Promise<boolean> {
        const permissions = await this.getUserPermissions(userId);
        return permissions[resource] === true;
    }

    /**
     * Delete user permission override
     */
    async deleteUserPermission(userId: string, resource: string) {
        const permission = await this.prisma.permission.findUnique({
            where: { resource }
        });

        if (!permission) {
            throw new NotFoundException('Permission not found');
        }

        await this.prisma.userPermission.deleteMany({
            where: {
                userId,
                permissionId: permission.id
            }
        });
    }
}
