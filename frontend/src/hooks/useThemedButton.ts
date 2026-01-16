import { useOrganization } from '@/contexts/OrganizationContext';
import { CSSProperties } from 'react';

/**
 * Hook to get themed button styles based on organization colors
 * Use this for buttons that don't use the Button component
 */
export function useThemedButtonStyle(variant: 'primary' | 'secondary' | 'outline' = 'primary'): CSSProperties {
    const { organization } = useOrganization();

    if (variant === 'primary' && organization?.themeConfig?.primaryColor) {
        return {
            backgroundColor: organization.themeConfig.primaryColor,
            color: '#ffffff',
            borderColor: organization.themeConfig.primaryColor,
        };
    }

    if (variant === 'secondary' && organization?.themeConfig?.secondaryColor) {
        return {
            backgroundColor: organization.themeConfig.secondaryColor,
            color: '#ffffff',
            borderColor: organization.themeConfig.secondaryColor,
        };
    }

    return {};
}

/**
 * Get CSS class names that should be removed when using themed styles
 */
export function getThemedButtonClasses(baseClasses: string, hasTheme: boolean): string {
    if (!hasTheme) return baseClasses;

    // Remove bg-* and text-* color classes when theme is applied
    return baseClasses
        .split(' ')
        .filter(cls => !cls.startsWith('bg-blue') && !cls.startsWith('hover:bg-blue'))
        .join(' ');
}
