import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SubscriptionCalculationService } from './subscription-calculation.service';
import { Prisma } from '@prisma/client';

interface InjectBalanceDto {
    accountId: string;
    amount: number;
    notes?: string;
    createdBy: string;
}

interface CreateAccountDto {
    serviceId: string;
    storeId: string;
}

@Injectable()
export class SubscriptionBalanceService {
    constructor(
        private prisma: PrismaService,
        private calculationService: SubscriptionCalculationService,
    ) { }

    /**
     * Inject balance into a subscription account (CREDIT)
     */
    async injectBalance(data: InjectBalanceDto) {
        const account = await this.prisma.subscriptionAccount.findUnique({
            where: { id: data.accountId },
        });

        if (!account) {
            throw new NotFoundException('Subscription account not found');
        }

        if (data.amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        return await this.prisma.$transaction(async (tx) => {
            // Create credit entry
            const entry = await tx.subscriptionBalanceEntry.create({
                data: {
                    accountId: data.accountId,
                    type: 'CREDIT',
                    source: 'INJECTION',
                    amount: data.amount,
                    notes: data.notes,
                    createdBy: data.createdBy,
                },
            });

            // Calculate new balance
            const newBalance = await this.calculationService.calculateAccountBalance(data.accountId);

            // Update account
            const updatedAccount = await tx.subscriptionAccount.update({
                where: { id: data.accountId },
                data: { balance: newBalance },
            });

            // Check if we should resolve any alerts
            await this.checkAndResolveAlerts(tx, data.accountId, newBalance);

            return {
                entry,
                account: updatedAccount,
                newBalance,
            };
        });
    }

    /**
     * Get current balance for an account (calculated from movements)
     */
    async getAccountBalance(accountId: string) {
        const account = await this.prisma.subscriptionAccount.findUnique({
            where: { id: accountId },
            include: {
                service: true,
            },
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        const calculatedBalance = await this.calculationService.calculateAccountBalance(accountId);

        return {
            account,
            calculatedBalance,
            storedBalance: Number(account.balance),
        };
    }

    /**
     * Get balance movement history
     */
    async getBalanceHistory(accountId: string, limit: number = 50) {
        return await this.prisma.subscriptionBalanceEntry.findMany({
            where: { accountId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Create or get subscription account for a service/store
     */
    async getOrCreateAccount(data: CreateAccountDto) {
        // Try to find existing account
        let account = await this.prisma.subscriptionAccount.findFirst({
            where: {
                serviceId: data.serviceId,
                storeId: data.storeId,
            },
        });

        if (!account) {
            // Create new account
            account = await this.prisma.subscriptionAccount.create({
                data: {
                    serviceId: data.serviceId,
                    storeId: data.storeId,
                    balance: 0,
                },
            });
        }

        return account;
    }

    /**
     * Check balance and generate alerts if needed
     */
    async checkAndGenerateAlerts(accountId: string, threshold: number | null = 10000) {
        const balance = await this.calculationService.calculateAccountBalance(accountId);
        const { shouldAlert, alertType } = this.calculationService.shouldTriggerAlert(balance, threshold);

        if (shouldAlert && alertType) {
            // Check if there's already an unresolved alert of this type
            const existingAlert = await this.prisma.subscriptionBalanceAlert.findFirst({
                where: {
                    accountId,
                    type: alertType,
                    resolved: false,
                },
            });

            if (!existingAlert) {
                // Create new alert
                await this.prisma.subscriptionBalanceAlert.create({
                    data: {
                        accountId,
                        type: alertType,
                        threshold: threshold,
                        currentBalance: balance,
                        resolved: false,
                    },
                });
            }
        }

        return { balance, shouldAlert, alertType };
    }

    /**
     * Get active alerts for an account
     */
    async getActiveAlerts(accountId: string) {
        return await this.prisma.subscriptionBalanceAlert.findMany({
            where: {
                accountId,
                resolved: false,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(alertId: string, resolvedBy: string) {
        return await this.prisma.subscriptionBalanceAlert.update({
            where: { id: alertId },
            data: {
                resolved: true,
                resolvedBy,
                resolvedAt: new Date(),
            },
        });
    }

    /**
     * Check and auto-resolve alerts if balance is healthy
     */
    private async checkAndResolveAlerts(
        tx: Prisma.TransactionClient,
        accountId: string,
        currentBalance: number,
    ) {
        // If balance is positive, resolve NEGATIVE alerts
        if (currentBalance >= 0) {
            await tx.subscriptionBalanceAlert.updateMany({
                where: {
                    accountId,
                    type: 'NEGATIVE',
                    resolved: false,
                },
                data: {
                    resolved: true,
                    resolvedAt: new Date(),
                },
            });
        }

        // Resolve LOW_BALANCE alerts if balance is above threshold
        const lowBalanceAlerts = await tx.subscriptionBalanceAlert.findMany({
            where: {
                accountId,
                type: 'LOW_BALANCE',
                resolved: false,
            },
        });

        for (const alert of lowBalanceAlerts) {
            if (alert.threshold && currentBalance >= Number(alert.threshold)) {
                await tx.subscriptionBalanceAlert.update({
                    where: { id: alert.id },
                    data: {
                        resolved: true,
                        resolvedAt: new Date(),
                    },
                });
            }
        }
    }
}
