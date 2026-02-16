import { api } from '@/services/api';

export interface Permission {
    id: string;
    resource: string;
    name: string;
    description?: string;
    category: string;
}

export interface UserPermissions {
    [resource: string]: boolean;
}

export interface RolePermission {
    resource: string;
    name: string;
    category: string;
    canAccess: boolean;
}

/**
 * Get all available permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
    const response = await api.get('/permissions');
    return response.data;
}

/**
 * Get current user's effective permissions
 */
export async function getMyPermissions(): Promise<UserPermissions> {
    const response = await api.get('/permissions/my');
    return response.data;
}

/**
 * Get role permissions for a specific role
 */
export async function getRolePermissions(role: string): Promise<RolePermission[]> {
    const response = await api.get(`/permissions/roles/${role}`);
    return response.data;
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(
    role: string,
    permissions: { resource: string; canAccess: boolean }[]
): Promise<RolePermission[]> {
    const response = await api.patch(`/permissions/roles/${role}`, { permissions });
    return response.data;
}

/**
 * Get user-specific permission overrides
 */
export async function getUserPermissionOverrides(userId: string): Promise<RolePermission[]> {
    const response = await api.get(`/permissions/users/${userId}`);
    return response.data;
}

/**
 * Update user-specific permissions
 */
export async function updateUserPermissions(
    userId: string,
    permissions: { resource: string; canAccess: boolean }[]
): Promise<RolePermission[]> {
    const response = await api.patch(`/permissions/users/${userId}`, { permissions });
    return response.data;
}

/**
 * Check if user has permission to a resource
 */
export function hasPermission(permissions: UserPermissions, resource: string): boolean {
    return permissions[resource] === true;
}

/**
 * Check if user can manage permissions (OWNER only)
 */
export function canManagePermissions(userRole: string): boolean {
    return userRole === 'OWNER';
}

/**
 * Group permissions by category
 */
export function groupPermissionsByCategory(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
            acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);
}
