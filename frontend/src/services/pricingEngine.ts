// Pricing Engine - Client-side implementation identical to backend
// Evaluates conditional pricing rules for subscription options

interface PricingCondition {
    offerPrice?: {
        gte?: number;
        lte?: number;
        gt?: number;
        lt?: number;
        eq?: number;
    };
    offerId?: string | string[];
    storeId?: string | string[];
    duration?: {
        gte?: number;
        lte?: number;
    };
}

interface PricingRule {
    condition: PricingCondition;
    price: number;
    priority: number;
}

interface PricingContext {
    offerPrice: number;
    offerId: string;
    storeId?: string;
    duration?: number;
}

/**
 * Evaluate pricing rules and return the applicable price
 * Rules are evaluated in priority order (highest first)
 * First matching rule wins
 */
export function evaluatePricingRules(
    rules: PricingRule[],
    context: PricingContext
): number | null {
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
        return null;
    }

    // Sort by priority (descending)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
        if (matchesCondition(rule.condition, context)) {
            return rule.price;
        }
    }

    return null;
}

/**
 * Calculate the total price for a subscription with options
 */
export function calculateSubscriptionPrice(
    offerBasePrice: number,
    offerPricingRules: PricingRule[] | null,
    options: Array<{ basePrice: number; pricingRules?: PricingRule[] | null }>,
    context: PricingContext
): {
    offerPrice: number;
    optionPrices: number[];
    totalPrice: number;
} {
    // Calculate offer price (may be modified by pricing rules)
    let offerPrice = offerBasePrice;
    if (offerPricingRules) {
        const rulePrice = evaluatePricingRules(offerPricingRules, context);
        if (rulePrice !== null) {
            offerPrice = rulePrice;
        }
    }

    // Calculate option prices
    const optionPrices: number[] = [];
    const contextWithOfferPrice = { ...context, offerPrice };

    for (const option of options) {
        let optionPrice = option.basePrice;

        if (option.pricingRules) {
            const rulePrice = evaluatePricingRules(option.pricingRules, contextWithOfferPrice);
            if (rulePrice !== null) {
                optionPrice = rulePrice;
            }
        }

        optionPrices.push(optionPrice);
    }

    // Calculate total
    const totalPrice = offerPrice + optionPrices.reduce((sum, price) => sum + price, 0);

    return { offerPrice, optionPrices, totalPrice };
}

/**
 * Check if a pricing condition matches the context
 */
function matchesCondition(condition: PricingCondition, context: PricingContext): boolean {
    // Check offer price conditions
    if (condition.offerPrice) {
        const { offerPrice } = condition;
        const contextPrice = context.offerPrice;

        if (offerPrice.gte !== undefined && contextPrice < offerPrice.gte) return false;
        if (offerPrice.lte !== undefined && contextPrice > offerPrice.lte) return false;
        if (offerPrice.gt !== undefined && contextPrice <= offerPrice.gt) return false;
        if (offerPrice.lt !== undefined && contextPrice >= offerPrice.lt) return false;
        if (offerPrice.eq !== undefined && contextPrice !== offerPrice.eq) return false;
    }

    // Check offer ID
    if (condition.offerId) {
        if (Array.isArray(condition.offerId)) {
            if (!condition.offerId.includes(context.offerId)) return false;
        } else {
            if (condition.offerId !== context.offerId) return false;
        }
    }

    // Check store ID
    if (condition.storeId && context.storeId) {
        if (Array.isArray(condition.storeId)) {
            if (!condition.storeId.includes(context.storeId)) return false;
        } else {
            if (condition.storeId !== context.storeId) return false;
        }
    }

    // Check duration
    if (condition.duration && context.duration !== undefined) {
        const { duration } = condition;
        const contextDuration = context.duration;

        if (duration.gte !== undefined && contextDuration < duration.gte) return false;
        if (duration.lte !== undefined && contextDuration > duration.lte) return false;
    }

    return true;
}

/**
 * Calculate new end date for a subscription renewal
 * Logic: max(currentEndDate, now) + duration
 */
export function calculateNewEndDate(currentEndDate: Date | null, durationInDays: number): Date {
    const now = new Date();
    const baseDate = currentEndDate && currentEndDate > now ? currentEndDate : now;

    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + durationInDays);

    return newEndDate;
}

/**
 * Calculate balance from balance entries
 */
export function calculateBalance(entries: Array<{ type: 'CREDIT' | 'DEBIT'; amount: number }>): number {
    let balance = 0;
    for (const entry of entries) {
        if (entry.type === 'CREDIT') {
            balance += entry.amount;
        } else if (entry.type === 'DEBIT') {
            balance -= entry.amount;
        }
    }
    return balance;
}
