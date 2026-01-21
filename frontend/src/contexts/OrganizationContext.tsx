import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface ThemeConfig {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    sidebarBgLight?: string;
    sidebarBgDark?: string;
    navbarBgLight?: string;
    navbarBgDark?: string;
}

interface Organization {
    id: string;
    name: string;
    logoUrl?: string;
    themeConfig?: ThemeConfig;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxId?: string;
    footer?: string;
}

interface OrganizationContextType {
    organization: Organization | null;
    isLoading: boolean;
    refetch: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '59 130 246'; // default blue-600
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const { data: organization, isLoading, refetch } = useQuery({
        queryKey: ['organization'],
        queryFn: async () => {
            const res = await api.get('/organizations/me');
            return res.data;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Apply theme colors to CSS variables
    useEffect(() => {
        if (organization?.themeConfig) {
            const theme = organization.themeConfig;
            const root = document.documentElement;

            // Apply colors in RGB format for Tailwind
            if (theme.primaryColor) {
                root.style.setProperty('--theme-primary', hexToRgb(theme.primaryColor));
                root.style.setProperty('--color-primary', theme.primaryColor);
            }
            if (theme.secondaryColor) {
                root.style.setProperty('--theme-secondary', hexToRgb(theme.secondaryColor));
                root.style.setProperty('--color-secondary', theme.secondaryColor);
            }
            if (theme.accentColor) {
                root.style.setProperty('--theme-accent', hexToRgb(theme.accentColor));
                root.style.setProperty('--color-accent', theme.accentColor);
            }
            if (theme.sidebarBgLight) {
                root.style.setProperty('--color-sidebar-bg-light', theme.sidebarBgLight);
            }
            if (theme.sidebarBgDark) {
                root.style.setProperty('--color-sidebar-bg-dark', theme.sidebarBgDark);
            }
            if (theme.navbarBgLight) {
                root.style.setProperty('--color-navbar-bg-light', theme.navbarBgLight);
            }
            if (theme.navbarBgDark) {
                root.style.setProperty('--color-navbar-bg-dark', theme.navbarBgDark);
            }
        }
    }, [organization]);

    return (
        <OrganizationContext.Provider value={{ organization, isLoading, refetch }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
