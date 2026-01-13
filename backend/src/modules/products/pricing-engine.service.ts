/**
 * Pricing Engine Service
 * 
 * This service evaluates dynamic pricing rules stored as JSONB.
 * Supports multiple pricing strategies:
 * - Tiered pricing (volume discounts)
 * - Time-based pricing (happy hour, seasonal)
 * - Customer-based pricing (loyalty tiers)
 * - Combination rules
 */

export interface PricingRule {
    type: 'tiered' | 'time-based' | 'customer-based' | 'fixed';
    priority?: number;
    rules: any;
}

export interface TieredPricingRule {
    type: 'tiered';
    tiers: Array<{
        min: number;
        max: number | null;
        discount: number; // 0.1 = 10% discount
        fixedPrice?: number; // Alternative to discount
    }>;
}

export interface TimeBasedPricingRule {
    type: 'time-based';
    schedules: Array<{
        dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
        startTime?: string; // HH:mm
        endTime?: string; // HH:mm
        discount: number;
    }>;
}

export interface CustomerBasedPricingRule {
    type: 'customer-based';
    tiers: Array<{
        customerTier: string; // 'bronze', 'silver', 'gold', etc.
        discount: number;
    }>;
}

export class PricingEngineService {
    /**
     * Calculate price based on pricing rules
     * 
     * @param basePrice - Base price of the product
     * @param quantity - Quantity being purchased
     * @param rules - Pricing rules (JSONB from database)
     * @param context - Additional context (customer, time, etc.)
     * @returns Calculated price per unit
     */
    calculatePrice(
        basePrice: number,
        quantity: number,
        rules?: any,
        context?: {
            customerId?: string;
            customerTier?: string;
            timestamp?: Date;
        },
    ): number {
        if (!rules) {
            return basePrice;
        }

        // Handle different rule types
        switch (rules.type) {
            case 'tiered':
                return this.applyTieredPricing(basePrice, quantity, rules);

            case 'time-based':
                return this.applyTimeBasedPricing(basePrice, rules, context?.timestamp);

            case 'customer-based':
                return this.applyCustomerBasedPricing(basePrice, rules, context?.customerTier);

            case 'fixed':
                return rules.price || basePrice;

            default:
                return basePrice;
        }
    }

    /**
     * Apply tiered pricing (volume discounts)
     */
    private applyTieredPricing(
        basePrice: number,
        quantity: number,
        rules: TieredPricingRule,
    ): number {
        const tier = rules.tiers.find(
            (t) => quantity >= t.min && (t.max === null || quantity <= t.max),
        );

        if (!tier) {
            return basePrice;
        }

        // Use fixed price if specified, otherwise apply discount
        if (tier.fixedPrice !== undefined) {
            return tier.fixedPrice;
        }

        return basePrice * (1 - tier.discount);
    }

    /**
     * Apply time-based pricing (happy hour, seasonal)
     */
    private applyTimeBasedPricing(
        basePrice: number,
        rules: TimeBasedPricingRule,
        timestamp?: Date,
    ): number {
        const now = timestamp || new Date();
        const dayOfWeek = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const applicableSchedule = rules.schedules.find((schedule) => {
            // Check day of week
            if (schedule.dayOfWeek && !schedule.dayOfWeek.includes(dayOfWeek)) {
                return false;
            }

            // Check time range
            if (schedule.startTime && schedule.endTime) {
                return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
            }

            return true;
        });

        if (!applicableSchedule) {
            return basePrice;
        }

        return basePrice * (1 - applicableSchedule.discount);
    }

    /**
     * Apply customer-based pricing (loyalty tiers)
     */
    private applyCustomerBasedPricing(
        basePrice: number,
        rules: CustomerBasedPricingRule,
        customerTier?: string,
    ): number {
        if (!customerTier) {
            return basePrice;
        }

        const tier = rules.tiers.find((t) => t.customerTier === customerTier);

        if (!tier) {
            return basePrice;
        }

        return basePrice * (1 - tier.discount);
    }

    /**
     * Calculate total price for multiple items
     */
    calculateTotal(
        items: Array<{
            basePrice: number;
            quantity: number;
            rules?: any;
        }>,
        context?: any,
    ): number {
        return items.reduce((total, item) => {
            const unitPrice = this.calculatePrice(
                item.basePrice,
                item.quantity,
                item.rules,
                context,
            );
            return total + unitPrice * item.quantity;
        }, 0);
    }

    /**
     * Validate pricing rules
     */
    validateRules(rules: any): { valid: boolean; errors?: string[] } {
        const errors: string[] = [];

        if (!rules.type) {
            errors.push('Rule type is required');
        }

        switch (rules.type) {
            case 'tiered':
                if (!rules.tiers || !Array.isArray(rules.tiers)) {
                    errors.push('Tiered rules must have tiers array');
                } else {
                    rules.tiers.forEach((tier: any, index: number) => {
                        if (tier.min === undefined) {
                            errors.push(`Tier ${index}: min is required`);
                        }
                        if (tier.discount === undefined && tier.fixedPrice === undefined) {
                            errors.push(`Tier ${index}: discount or fixedPrice is required`);
                        }
                    });
                }
                break;

            case 'time-based':
                if (!rules.schedules || !Array.isArray(rules.schedules)) {
                    errors.push('Time-based rules must have schedules array');
                }
                break;

            case 'customer-based':
                if (!rules.tiers || !Array.isArray(rules.tiers)) {
                    errors.push('Customer-based rules must have tiers array');
                }
                break;
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
}
