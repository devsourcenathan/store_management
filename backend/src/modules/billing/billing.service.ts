import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotchPayService } from './notchpay.service';
import {
    BillingCycle,
    PlatformSubscriptionStatus,
    PlatformPlanType,
    UserRole,
    InvoiceStatus
} from '@prisma/client';
import {
    CreatePlanDto,
    UpdatePlanDto,
    SubscribeDto,
    AdminAssignSubscriptionDto,
    AdminUpdateSubscriptionDto
} from './dto';
import { addMonths, addDays } from 'date-fns';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private notchPayService: NotchPayService,
    ) { }

    // ============================================
    // PLAN MANAGEMENT (Admin)
    // ============================================

    async getAllPlans(includeInactive = false) {
        return this.prisma.platformPlan.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: { type: 'asc' },
        });
    }

    async getPlanById(id: string) {
        const plan = await this.prisma.platformPlan.findUnique({ where: { id } });
        if (!plan) throw new NotFoundException('Plan not found');
        return plan;
    }

    async createPlan(data: CreatePlanDto) {
        return this.prisma.platformPlan.create({
            data: {
                name: data.name,
                type: data.type,
                monthlyPrice: data.monthlyPrice,
                semiAnnualPrice: data.semiAnnualPrice,
                annualPrice: data.annualPrice,
                maxStores: data.maxStores,
                maxProducts: data.maxProducts,
                maxUsers: data.maxUsers,
                features: data.features,
                trialDays: data.trialDays || 0,
            },
        });
    }

    async updatePlan(id: string, data: UpdatePlanDto) {
        await this.getPlanById(id); // Ensure exists
        return this.prisma.platformPlan.update({
            where: { id },
            data,
        });
    }

    async deletePlan(id: string) {
        await this.getPlanById(id);
        return this.prisma.platformPlan.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // ============================================
    // SUBSCRIPTION MANAGEMENT
    // ============================================

    async getOrganizationSubscription(organizationId: string) {
        return this.prisma.organizationSubscription.findUnique({
            where: { organizationId },
            include: {
                plan: true,
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });
    }

    async getAllSubscriptions() {
        return this.prisma.organizationSubscription.findMany({
            include: {
                organization: true,
                plan: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Calculate price based on billing cycle
     */
    calculatePrice(plan: any, billingCycle: BillingCycle): { amount: number; discount: number } {
        let amount: number;
        let discount = 0;

        switch (billingCycle) {
            case BillingCycle.MONTHLY:
                amount = Number(plan.monthlyPrice);
                break;
            case BillingCycle.SEMI_ANNUAL:
                amount = Number(plan.semiAnnualPrice);
                discount = (Number(plan.monthlyPrice) * 6) - amount;
                break;
            case BillingCycle.ANNUAL:
                amount = Number(plan.annualPrice);
                discount = (Number(plan.monthlyPrice) * 12) - amount;
                break;
            default:
                amount = Number(plan.monthlyPrice);
        }

        return { amount, discount };
    }

    /**
     * Calculate period end date based on billing cycle
     */
    calculatePeriodEnd(startDate: Date, billingCycle: BillingCycle): Date {
        switch (billingCycle) {
            case BillingCycle.MONTHLY:
                return addMonths(startDate, 1);
            case BillingCycle.SEMI_ANNUAL:
                return addMonths(startDate, 6);
            case BillingCycle.ANNUAL:
                return addMonths(startDate, 12);
            default:
                return addMonths(startDate, 1);
        }
    }

    /**
     * Initialize subscription payment
     */
    async initializeSubscription(
        organizationId: string,
        data: SubscribeDto,
        userEmail: string,
        callbackUrl: string,
    ) {
        const plan = await this.getPlanById(data.planId);

        // Check if organization already has active subscription
        const existing = await this.prisma.organizationSubscription.findUnique({
            where: { organizationId },
        });

        if (existing && ['ACTIVE', 'LIFETIME', 'TRIALING'].includes(existing.status)) {
            // Allow if switching plans
            if (existing.planId === plan.id && existing.billingCycle === data.billingCycle) {
                throw new BadRequestException('Organization already has an active subscription for this plan');
            }
        }

        const { amount, discount } = this.calculatePrice(plan, data.billingCycle);
        const reference = `SUB-${organizationId.substring(0, 8)}-${Date.now()}`;

        // Check for trial eligibility
        const isEligibleForTrial = !existing && plan.trialDays > 0;

        if (isEligibleForTrial) {
            // Create trial subscription directly
            const now = new Date();
            const trialEnd = addDays(now, plan.trialDays);

            const subscription = await this.prisma.organizationSubscription.upsert({
                where: { organizationId },
                create: {
                    organizationId,
                    planId: plan.id,
                    status: PlatformSubscriptionStatus.TRIALING,
                    billingCycle: data.billingCycle,
                    currentPeriodStart: now,
                    currentPeriodEnd: trialEnd,
                    trialEndsAt: trialEnd,
                },
                update: {
                    planId: plan.id,
                    status: PlatformSubscriptionStatus.TRIALING,
                    billingCycle: data.billingCycle,
                    currentPeriodStart: now,
                    currentPeriodEnd: trialEnd,
                    trialEndsAt: trialEnd,
                },
            });

            return {
                type: 'trial',
                subscription,
                message: `Trial period of ${plan.trialDays} days started`,
            };
        }

        // Initialize payment
        const payment = await this.notchPayService.initializePayment({
            amount,
            currency: this.configService.get('NOTCHPAY_DEFAULT_CURRENCY') || 'XAF',
            email: userEmail,
            reference,
            description: `${plan.name} subscription - ${data.billingCycle}`,
            callback: callbackUrl,
        });

        this.logger.log(`NotchPay Response: ${JSON.stringify(payment)}`);

        // Create pending invoice
        await this.prisma.billingInvoice.create({
            data: {
                subscription: {
                    connectOrCreate: {
                        where: { organizationId },
                        create: {
                            organizationId,
                            planId: plan.id,
                            status: PlatformSubscriptionStatus.PAST_DUE,
                            billingCycle: data.billingCycle,
                            currentPeriodStart: new Date(),
                        },
                    },
                },
                invoiceNumber: reference,
                plan: { connect: { id: plan.id } }, // Store target plan
                amount,
                discount,
                finalAmount: amount,
                status: 'PENDING',
                dueDate: addDays(new Date(), 7),
                notchpayRef: payment.transaction.reference,
                paymentUrl: payment.authorization_url,
            },
        });

        return {
            type: 'payment',
            paymentUrl: payment.authorization_url,
            reference: payment.transaction.reference,
        };
    }

    /**
     * Handle payment webhook/callback
     */
    async handlePaymentCallback(reference: string) {
        const verification = await this.notchPayService.verifyPayment(reference);

        if (verification.transaction.status !== 'complete') {
            this.logger.warn(`Payment not complete: ${reference} - ${verification.transaction.status}`);
            return { success: false, status: verification.transaction.status };
        }

        // Find and update invoice
        const invoice = await this.prisma.billingInvoice.findFirst({
            where: { notchpayRef: reference },
            include: { subscription: { include: { plan: true } } },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found for reference');
        }

        const now = new Date();
        const periodEnd = this.calculatePeriodEnd(now, invoice.subscription.billingCycle!);

        // Update invoice and subscription in transaction
        await this.prisma.$transaction([
            this.prisma.billingInvoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'PAID',
                    paidAt: now,
                },
            }),
            this.prisma.organizationSubscription.update({
                where: { id: invoice.subscriptionId },
                data: {
                    status: PlatformSubscriptionStatus.ACTIVE,
                    planId: invoice.planId || undefined, // Update plan if invoice has it
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            }),
        ]);

        this.logger.log(`Subscription activated for invoice: ${invoice.invoiceNumber}`);
        return { success: true, status: 'active' };
    }

    // ============================================
    // ADMIN SUBSCRIPTION MANAGEMENT
    // ============================================

    /**
     * Admin: Manually assign subscription to organization
     */
    async adminAssignSubscription(data: AdminAssignSubscriptionDto, adminId: string) {
        const plan = await this.getPlanById(data.planId);
        const now = new Date();

        let periodEnd: Date | null = null;
        if (!data.isLifetime && data.billingCycle) {
            periodEnd = this.calculatePeriodEnd(now, data.billingCycle);
        }

        return this.prisma.organizationSubscription.upsert({
            where: { organizationId: data.organizationId },
            create: {
                organizationId: data.organizationId,
                planId: plan.id,
                status: data.isLifetime
                    ? PlatformSubscriptionStatus.LIFETIME
                    : PlatformSubscriptionStatus.ACTIVE,
                billingCycle: data.billingCycle,
                isLifetime: data.isLifetime || false,
                hideBillingUI: data.hideBillingUI || false,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                assignedByAdmin: adminId,
            },
            update: {
                planId: plan.id,
                status: data.isLifetime
                    ? PlatformSubscriptionStatus.LIFETIME
                    : PlatformSubscriptionStatus.ACTIVE,
                billingCycle: data.billingCycle,
                isLifetime: data.isLifetime || false,
                hideBillingUI: data.hideBillingUI || false,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                assignedByAdmin: adminId,
            },
            include: { organization: true, plan: true },
        });
    }

    /**
     * Admin: Update subscription
     */
    async adminUpdateSubscription(subscriptionId: string, data: AdminUpdateSubscriptionDto, adminId: string) {
        const subscription = await this.prisma.organizationSubscription.findUnique({
            where: { id: subscriptionId },
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        const updateData: any = {};

        if (data.planId) updateData.planId = data.planId;
        if (data.billingCycle !== undefined) updateData.billingCycle = data.billingCycle;
        if (data.isLifetime !== undefined) {
            updateData.isLifetime = data.isLifetime;
            updateData.status = data.isLifetime
                ? PlatformSubscriptionStatus.LIFETIME
                : PlatformSubscriptionStatus.ACTIVE;
        }
        if (data.hideBillingUI !== undefined) updateData.hideBillingUI = data.hideBillingUI;
        if (data.extendDays) {
            const currentEnd = subscription.currentPeriodEnd || new Date();
            updateData.currentPeriodEnd = addDays(currentEnd, data.extendDays);
        }

        updateData.assignedByAdmin = adminId;

        return this.prisma.organizationSubscription.update({
            where: { id: subscriptionId },
            data: updateData,
            include: { organization: true, plan: true },
        });
    }

    /**
     * Admin: Cancel subscription
     */
    async adminCancelSubscription(subscriptionId: string) {
        return this.prisma.organizationSubscription.update({
            where: { id: subscriptionId },
            data: {
                status: PlatformSubscriptionStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });
    }

    // ============================================
    // INVOICES
    // ============================================

    async getOrganizationInvoices(organizationId: string) {
        const subscription = await this.prisma.organizationSubscription.findUnique({
            where: { organizationId },
        });

        if (!subscription) return [];

        return this.prisma.billingInvoice.findMany({
            where: { subscriptionId: subscription.id },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getInvoiceById(invoiceId: string) {
        const invoice = await this.prisma.billingInvoice.findUnique({
            where: { id: invoiceId },
            include: {
                subscription: {
                    include: { organization: true, plan: true },
                },
            },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        return invoice;
    }

    /**
     * Check for expired trials and process them (generate invoice, set to PAST_DUE)
     * To be called by SchedulerService
     */
    async handleExpiredTrials() {
        const now = new Date();
        const expiredTrials = await this.prisma.organizationSubscription.findMany({
            where: {
                status: PlatformSubscriptionStatus.TRIALING,
                trialEndsAt: { lt: now },
            },
            include: {
                organization: {
                    include: {
                        users: {
                            where: { role: UserRole.OWNER, isActive: true },
                            take: 1
                        }
                    }
                },
                plan: true,
            },
        });

        if (expiredTrials.length > 0) {
            this.logger.log(`Found ${expiredTrials.length} expired trials to process`);
        }

        const processed = [];

        for (const sub of expiredTrials) {
            try {
                const plan = sub.plan;
                const billingCycle = sub.billingCycle || BillingCycle.MONTHLY;

                const { amount, discount } = this.calculatePrice(plan, billingCycle);
                const reference = `SUB-${sub.organizationId.substring(0, 8)}-${Date.now()}`;

                // Get email
                const owner = sub.organization.users[0];
                const email = owner?.email || sub.organization.email;

                if (!email) {
                    this.logger.warn(`Skipping expired trial for org ${sub.organizationId}: No valid email found`);
                    continue;
                }

                // Initialize NotchPay
                // Default callback URL since we don't have context here
                const callbackUrl = `https://stock.sekuu.com/billing`;

                const payment = await this.notchPayService.initializePayment({
                    amount,
                    currency: this.configService.get('NOTCHPAY_DEFAULT_CURRENCY') || 'XAF',
                    email,
                    reference,
                    description: `${plan.name} Subscription (Post-Trial) - ${billingCycle}`,
                    callback: callbackUrl,
                });

                // Create Invoice
                await this.prisma.billingInvoice.create({
                    data: {
                        subscription: { connect: { id: sub.id } },
                        invoiceNumber: reference,
                        planId: plan.id,
                        amount,
                        discount,
                        finalAmount: amount,
                        status: InvoiceStatus.PENDING,
                        dueDate: addDays(new Date(), 7),
                        notchpayRef: payment.transaction.reference,
                        paymentUrl: payment.authorization_url,
                    },
                });

                // Update subscription to PAST_DUE
                await this.prisma.organizationSubscription.update({
                    where: { id: sub.id },
                    data: {
                        status: PlatformSubscriptionStatus.PAST_DUE,
                    }
                });

                processed.push({
                    orgId: sub.organizationId,
                    email,
                    amount,
                    paymentUrl: payment.authorization_url
                });

                this.logger.log(`Processed expired trial for org ${sub.organizationId}. Invoice created.`);

            } catch (error) {
                this.logger.error(`Failed to process expired trial for sub ${sub.id}`, error);
            }
        }

        return processed;
    }
}
