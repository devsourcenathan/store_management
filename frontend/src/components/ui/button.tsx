import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useOrganization } from "@/contexts/OrganizationContext"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, style, ...props }, ref) => {
        const { organization } = useOrganization();

        const hasThemeColor = variant === 'default' && organization?.themeConfig?.primaryColor;

        // Apply theme color for default variant
        const themedStyle = hasThemeColor && organization?.themeConfig ? {
            backgroundColor: organization.themeConfig.primaryColor,
            color: '#ffffff',
            ...style
        } : style;

        // Remove bg classes if using theme color to avoid conflicts
        const buttonClass = hasThemeColor
            ? cn(buttonVariants({ variant: 'default', size, className })).replace(/bg-\S+/g, '').replace(/text-primary-foreground/g, '')
            : cn(buttonVariants({ variant, size, className }));

        return (
            <button
                className={buttonClass}
                ref={ref}
                style={themedStyle}
                onMouseEnter={(e) => {
                    if (hasThemeColor) {
                        e.currentTarget.style.filter = 'brightness(0.9)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (hasThemeColor) {
                        e.currentTarget.style.filter = 'brightness(1)';
                    }
                }}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
