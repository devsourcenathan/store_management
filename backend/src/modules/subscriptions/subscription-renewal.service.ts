import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SubscriptionCalculationService } from './subscription-calculation.service';
import { Prisma } from '@prisma/client';

interface CreateRenewalDto {
    subscriptionId: string;
    duration: number;
    price: number;
    balanceUsed: number;
    createdBy: string;
    clientId?: string;
}

@Injectable()
export class SubscriptionRenewalService {
    constructor(
        private prisma: PrismaService,
        private calculationService: SubscriptionCalculationService,
    ) { }

    /**
     * Create a subscription renewal
     * - Validates the renewal
     * - Creates renewal record
     * - Updates subscription endDate
     * - Debits balance account
     * - Updates subscription status if needed
     */
    async createRenewal(data: CreateRenewalDto) {
        // Validate renewal
        const validation = await this.calculationService.validateRenewal(
            data.subscriptionId,
            data.duration,
            data.price,
        );

        if (!validation.valid) {
            throw new BadRequestException(validation.error);
        }

        // Get subscription with offer details
        const subscription = await this.prisma.customerSubscription.findUnique({
            where: { id: data.subscriptionId },
            include: {
                offer: {
                    include: {
                        service: true,
                    },
                },
                customer: true,
            },
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        // Calculate new end date
        const newEndDate = this.calculationService.calculateNewEndDate(
            subscription.endDate,
            data.duration,
        );

        // Execute in transaction
        return await this.prisma.$transaction(async (tx) => {
            // 1. Create renewal record
            const renewal = await tx.subscriptionRenewal.create({
                data: {
                    subscriptionId: data.subscriptionId,
                    duration: data.duration,
                    price: data.price,
                    balanceUsed: data.balanceUsed,
                    createdBy: data.createdBy,
                    clientId: data.clientId,
                },
            });

            // 2. Update subscription end date and status
            const updatedSubscription = await tx.customerSubscription.update({
                where: { id: data.subscriptionId },
                data: {
                    endDate: newEndDate,
                    status: 'ACTIVE', // Reactivate if it was expired
                    updatedAt: new Date(),
                },
            });

            // 3. Debit balance account if balanceUsed > 0
            if (data.balanceUsed > 0) {
                // Find or create subscription account for this service
                const account = await tx.subscriptionAccount.findFirst({
                    where: {
                        serviceId: subscription.offer.serviceId,
                        storeId: subscription.customer.organizationId, // Using orgId as storeId for now
                    },
                });

                if (account) {
                    // Create debit entry
                    await tx.subscriptionBalanceEntry.create({
                        data: {
                            accountId: account.id,
                            type: 'DEBIT',
                            source: 'SUBSCRIPTION',
                            amount: data.balanceUsed,
                            reference: renewal.id,
                            notes: `Renewal for subscription ${subscription.id}`,
                            createdBy: data.createdBy,
                        },
                    });

                    // Update account balance (for quick reference, though not source of truth)
                    const newBalance = await this.calculationService.calculateAccountBalance(account.id);
                    await tx.subscriptionAccount.update({
                        where: { id: account.id },
                        data: { balance: newBalance },
                    });
                }
            }

            return {
                renewal,
                subscription: updatedSubscription,
                newEndDate,
            };
        }, { timeout: 60000 });
    }

    /**
     * Get renewal history for a subscription
     */
    async getRenewalHistory(subscriptionId: string) {
        return await this.prisma.subscriptionRenewal.findMany({
            where: { subscriptionId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get all renewals for a customer
     */
    async getCustomerRenewals(customerId: string) {
        return await this.prisma.subscriptionRenewal.findMany({
            where: {
                subscription: {
                    customerId,
                },
            },
            include: {
                subscription: {
                    include: {
                        offer: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
