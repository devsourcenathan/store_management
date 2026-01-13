import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionCalculationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate new end date for a subscription renewal
     * Logic: max(currentEndDate, now) + duration
     * This ensures that renewals always extend from the latest date
     */
    calculateNewEndDate(currentEndDate: Date | null, durationInDays: number): Date {
        const now = new Date();
        const baseDate = currentEndDate && currentEndDate > now ? currentEndDate : now;

        const newEndDate = new Date(baseDate);
        newEndDate.setDate(newEndDate.getDate() + durationInDays);

        return newEndDate;
    }

    /**
     * Calculate the real balance of a subscription account
     * Balance = SUM(amount WHERE type = CREDIT) - SUM(amount WHERE type = DEBIT)
     */
    async calculateAccountBalance(accountId: string): Promise<number> {
        const entries = await this.prisma.subscriptionBalanceEntry.findMany({
            where: { accountId },
            select: { type: true, amount: true },
        });

        let balance = 0;
        for (const entry of entries) {
            const amount = Number(entry.amount);
            if (entry.type === 'CREDIT') {
                balance += amount;
            } else if (entry.type === 'DEBIT') {
                balance -= amount;
            }
        }

        return balance;
    }

    /**
     * Check if balance is below threshold and should trigger an alert
     */
    shouldTriggerAlert(balance: number, threshold: number | null): {
        shouldAlert: boolean;
        alertType: 'NEGATIVE' | 'LOW_BALANCE' | null;
    } {
        if (balance < 0) {
            return { shouldAlert: true, alertType: 'NEGATIVE' };
        }

        if (threshold !== null && balance < threshold) {
            return { shouldAlert: true, alertType: 'LOW_BALANCE' };
        }

        return { shouldAlert: false, alertType: null };
    }

    /**
     * Validate that a renewal can be processed
     */
    async validateRenewal(subscriptionId: string, duration: number, price: number): Promise<{
        valid: boolean;
        error?: string;
    }> {
        // Check subscription exists and is active
        const subscription = await this.prisma.customerSubscription.findUnique({
            where: { id: subscriptionId },
            include: { offer: true },
        });

        if (!subscription) {
            return { valid: false, error: 'Subscription not found' };
        }

        if (subscription.status === 'CANCELLED') {
            return { valid: false, error: 'Cannot renew a cancelled subscription' };
        }

        // Validate duration is positive
        if (duration <= 0) {
            return { valid: false, error: 'Duration must be positive' };
        }

        // Validate price is positive
        if (price < 0) {
            return { valid: false, error: 'Price cannot be negative' };
        }

        return { valid: true };
    }
}
