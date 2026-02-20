import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
    constructor(private prisma: PrismaService) { }

    async getAccounts(storeId: string | undefined, organizationId: string) {
        // 1. Determine target store
        let targetStoreId = storeId;
        if (!targetStoreId) {
            // Fallback to first store of organization
            const store = await this.prisma.store.findFirst({
                where: { organizationId }
            });
            if (store) targetStoreId = store.id;
        }

        if (!targetStoreId) return [];

        // 2. Ensure accounts exist for all services
        // Fetch all active services
        const services = await this.prisma.service.findMany({
            where: { organizationId, isActive: true }
        });

        if (services.length > 0) {
            // Find existing accounts
            const existingAccounts = await this.prisma.subscriptionAccount.findMany({
                where: {
                    storeId: targetStoreId,
                    serviceId: { in: services.map(s => s.id) }
                }
            });

            const existingServiceIds = new Set(existingAccounts.map(a => a.serviceId));
            const missingServices = services.filter(s => !existingServiceIds.has(s.id));

            // Create missing accounts
            if (missingServices.length > 0) {
                await this.prisma.$transaction(
                    missingServices.map(service =>
                        this.prisma.subscriptionAccount.create({
                            data: {
                                serviceId: service.id,
                                storeId: targetStoreId!,
                                balance: 0
                            }
                        })
                    )
                );
            }
        }

        // 3. Return all accounts
        return this.prisma.subscriptionAccount.findMany({
            where: { storeId: targetStoreId },
            include: {
                service: true,
                _count: {
                    select: { balanceEntries: true }
                }
            },
        });
    }

    async injection(data: { accountId: string; amount: number; notes?: string }, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Create entry
            await tx.subscriptionBalanceEntry.create({
                data: {
                    accountId: data.accountId,
                    type: 'CREDIT',
                    source: 'INJECTION',
                    amount: data.amount,
                    notes: data.notes,
                    createdBy: userId,
                },
            });

            // 2. Update account balance
            return tx.subscriptionAccount.update({
                where: { id: data.accountId },
                data: {
                    balance: { increment: data.amount }
                },
            });
        });
    }

    async findAll() {
        return this.prisma.customerSubscription.findMany({
            include: {
                customer: true,
                offer: {
                    include: {
                        service: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async create(data: any, userId: string) {
        // Fetch offer first to get duration and service details
        const offer = await this.prisma.subscriptionOffer.findUnique({
            where: { id: data.offerId },
            include: { service: true }
        });

        if (!offer) {
            throw new Error('Offer not found');
        }

        // Fetch customer to get organization ID
        const customer = await this.prisma.customer.findUnique({
            where: { id: data.customerId }
        });

        if (!customer) {
            throw new Error('Customer not found');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Calculate dates
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + offer.duration * 24 * 60 * 60 * 1000);

            // 2. Create subscription
            const sub = await tx.customerSubscription.create({
                data: {
                    customerId: data.customerId,
                    offerId: data.offerId,
                    status: 'ACTIVE',
                    startDate: startDate,
                    endDate: endDate,
                    autoRenew: true,
                    options: {
                        connect: (data.options || []).map((id: string) => ({ id }))
                    }
                }
            });

            // 3. Handle balance payment if needed
            let balancePayment = 0;
            if (data.balanceUsed > 0) {
                // Find a store for the customer's organization first
                const store = await tx.store.findFirst({
                    where: { organizationId: customer.organizationId }
                });

                if (store) {
                    // Find subscription account for this service/store
                    const account = await tx.subscriptionAccount.findFirst({
                        where: {
                            serviceId: offer.serviceId,
                            storeId: store.id
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
                                reference: sub.id,
                                notes: `New subscription ${sub.id}`,
                                createdBy: userId,
                            },
                        });

                        // Update account balance
                        await tx.subscriptionAccount.update({
                            where: { id: account.id },
                            data: { balance: { decrement: data.balanceUsed } }
                        });

                        balancePayment = Number(data.balanceUsed);
                    }
                }
            }

            // 4. Create Sale to record revenue
            // Find a store for the sale (fallback to first store of org if customer has no specific store linked)
            // Ideally should be passed from frontend
            const store = await tx.store.findFirst({
                where: { organizationId: customer.organizationId }
            });

            if (store) {
                // Ensure Product exists for this Service
                const productSku = `SERVICE-${offer.serviceId.substring(0, 8).toUpperCase()}`;
                let product = await tx.product.findFirst({
                    where: { sku: productSku, organizationId: customer.organizationId }
                });

                if (!product) {
                    // Create placeholder product for Service
                    product = await tx.product.create({
                        data: {
                            name: offer.service.name,
                            sku: productSku,
                            basePrice: offer.service.description ? 0 : 0, // Placeholder
                            organizationId: customer.organizationId,
                            isActive: true,

                        }
                    });
                }

                // Create Sale
                const totalAmount = data.price || offer.basePrice; // Simplified, ideally passed correctly
                const sale = await tx.sale.create({
                    data: {
                        storeId: store.id,
                        customerId: customer.id,
                        totalAmount: totalAmount,
                        paidAmount: totalAmount, // Assuming fully paid for now
                        status: 'PAID',
                        notes: `Subscription: ${offer.name} (${sub.id})`,
                        createdBy: userId,
                        items: {
                            create: {
                                productId: product.id,
                                quantity: 1,
                                unitPrice: totalAmount,
                                total: totalAmount,
                                discount: 0
                            }
                        }
                    }
                });

                // Create Payments
                // 1. Balance Payment
                if (balancePayment > 0) {
                    await tx.payment.create({
                        data: {
                            saleId: sale.id,
                            amount: balancePayment,
                            method: 'CREDIT', // Use CREDIT for balance
                            notes: 'Paid via Subscription Balance',
                            createdBy: userId
                        }
                    });
                }

                // 2. Cash/Other Payment
                const remaining = Number(totalAmount) - balancePayment;
                if (remaining > 0) {
                    await tx.payment.create({
                        data: {
                            saleId: sale.id,
                            amount: remaining,
                            method: 'CASH', // Default to CASH for remainder
                            notes: 'Cash/External Payment',
                            createdBy: userId
                        }
                    });
                }
            }


            return sub;
        });
    }

    async getHistory(accountId: string) {
        return this.prisma.subscriptionBalanceEntry.findMany({
            where: { accountId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
