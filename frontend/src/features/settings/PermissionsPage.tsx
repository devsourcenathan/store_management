import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    getAllPermissions,
    getRolePermissions,
    updateRolePermissions,
    groupPermissionsByCategory,
    Permission,
    RolePermission,
} from '@/utils/permissions';
import { Shield, Save, RotateCcw, Loader2 } from 'lucide-react';

export function PermissionsPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [managerPermissions, setManagerPermissions] = useState<Record<string, boolean>>({});
    const [staffPermissions, setStaffPermissions] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            setIsLoading(true);
            const [permissions, managerPerms, staffPerms] = await Promise.all([
                getAllPermissions(),
                getRolePermissions('MANAGER'),
                getRolePermissions('STAFF'),
            ]);

            setAllPermissions(permissions);

            // Convert to lookup maps
            const managerMap: Record<string, boolean> = {};
            managerPerms.forEach(p => {
                managerMap[p.resource] = p.canAccess;
            });
            setManagerPermissions(managerMap);

            const staffMap: Record<string, boolean> = {};
            staffPerms.forEach(p => {
                staffMap[p.resource] = p.canAccess;
            });
            setStaffPermissions(staffMap);
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            toast.error(t('permissions.load_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (resource: string, role: 'MANAGER' | 'STAFF') => {
        if (role === 'MANAGER') {
            setManagerPermissions(prev => ({
                ...prev,
                [resource]: !prev[resource],
            }));
        } else {
            setStaffPermissions(prev => ({
                ...prev,
                [resource]: !prev[resource],
            }));
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Prepare permission updates
            const managerUpdates = allPermissions.map(p => ({
                resource: p.resource,
                canAccess: managerPermissions[p.resource] || false,
            }));

            const staffUpdates = allPermissions.map(p => ({
                resource: p.resource,
                canAccess: staffPermissions[p.resource] || false,
            }));

            // Update both roles
            await Promise.all([
                updateRolePermissions('MANAGER', managerUpdates),
                updateRolePermissions('STAFF', staffUpdates),
            ]);

            toast.success(t('permissions.save_success'));
        } catch (error) {
            console.error('Failed to save permissions:', error);
            toast.error(t('permissions.save_error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        fetchPermissions();
        fetchPermissions();
        toast.info(t('permissions.reset_message'));
    };

    if (user?.role !== 'OWNER') {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold mb-2">{t('permissions.access_denied')}</h2>
                    <p className="text-gray-600">{t('permissions.owner_only')}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const groupedPermissions = groupPermissionsByCategory(allPermissions);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{t('permissions.title')}</h1>
                <p className="text-gray-600">
                    {t('permissions.subtitle')}
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">{t('permissions.role_permissions')}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {t('permissions.owner_description')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                <RotateCcw className="w-4 h-4 inline mr-2" />
                                {t('permissions.reset')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {t('permissions.save_changes')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                        <div key={category} className="mb-8 last:mb-0">
                            <h3 className="text-lg font-semibold mb-4 capitalize">{t(`permissions.categories.${category}` as any)}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                                                {t('permissions.resource')}
                                            </th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 w-32">
                                                {t('permissions.manager')}
                                            </th>
                                            <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 w-32">
                                                {t('permissions.staff')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {permissions.map((permission) => (
                                            <tr
                                                key={permission.id}
                                                className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                            >
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {t(`permissions.resources.${permission.resource}` as any)}
                                                        </div>
                                                        {permission.description && (
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {permission.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={managerPermissions[permission.resource] || false}
                                                            onChange={() => handleToggle(permission.resource, 'MANAGER')}
                                                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                        />
                                                    </label>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={staffPermissions[permission.resource] || false}
                                                            onChange={() => handleToggle(permission.resource, 'STAFF')}
                                                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                        />
                                                    </label>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 {t('permissions.how_it_works.title')}</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• <strong>OWNER</strong> {t('permissions.how_it_works.owner')}</li>
                    <li>• <strong>MANAGER</strong> {t('permissions.how_it_works.configurable')}</li>
                    <li>• {t('permissions.how_it_works.immediate')}</li>
                    <li>• {t('permissions.how_it_works.sidebar')}</li>
                </ul>
            </div>
        </div>
    );
}
