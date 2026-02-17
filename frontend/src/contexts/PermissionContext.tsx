import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { getMyPermissions, UserPermissions } from '@/utils/permissions';

interface PermissionContextType {
    permissions: UserPermissions;
    isLoading: boolean;
    hasPermission: (resource: string) => boolean;
    refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<UserPermissions>({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchPermissions = async () => {
        if (!user) {
            setPermissions({});
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const userPermissions = await getMyPermissions();
            setPermissions(userPermissions);
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            setPermissions({});
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
    }, [user?.id]);

    const hasPermission = (resource: string): boolean => {
        // OWNER has full access
        if (user?.role === 'OWNER') return true;
        // GLOBAL_ADMIN only has admin access
        if (user?.role === 'GLOBAL_ADMIN') return resource === 'admin';
        // Check permissions
        return permissions[resource] === true;
    };

    const refreshPermissions = async () => {
        await fetchPermissions();
    };

    return (
        <PermissionContext.Provider value={{ permissions, isLoading, hasPermission, refreshPermissions }}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionProvider');
    }
    return context;
}
