import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionRenewalService } from './subscription-renewal.service';
import { SubscriptionBalanceService } from './subscription-balance.service';
import { PricingEngineService } from './pricing-engine.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
    constructor(
        private readonly subscriptionsService: SubscriptionsService,
        private readonly renewalService: SubscriptionRenewalService,
        private readonly balanceService: SubscriptionBalanceService,
        private readonly pricingEngine: PricingEngineService,
    ) { }

    // ============================================
    // SUBSCRIPTIONS (CORE)
    // ============================================

    @Post()
    async create(@Body() data: any) {
        return this.subscriptionsService.create(data);
    }

    @Get()
    async findAll() {
        return this.subscriptionsService.findAll();
    }

    // ============================================
    // SUBSCRIPTION ACCOUNTS
    // ============================================

    @Get('accounts')
    async getAccounts(@Query('storeId') storeId: string, @Request() req: any) {
        return this.subscriptionsService.getAccounts(storeId, req.user.organizationId);
    }

    @Get('accounts/:accountId/balance')
    async getAccountBalance(@Param('accountId') accountId: string) {
        return this.balanceService.getAccountBalance(accountId);
    }

    @Get('accounts/:accountId/history')
    async getBalanceHistory(
        @Param('accountId') accountId: string,
        @Query('limit') limit?: string,
    ) {
        return this.balanceService.getBalanceHistory(accountId, limit ? parseInt(limit) : 50);
    }

    // ============================================
    // BALANCE INJECTION
    // ============================================

    @Post('accounts/:accountId/inject')
    async injectBalance(
        @Param('accountId') accountId: string,
        @Body() data: { amount: number; notes?: string },
        @Request() req: any,
    ) {
        return this.balanceService.injectBalance({
            accountId,
            amount: data.amount,
            notes: data.notes,
            createdBy: req.user.id,
        });
    }

    // Legacy endpoint for backward compatibility
    @Post('injection')
    async injection(@Body() data: any, @Request() req: any) {
        return this.subscriptionsService.injection(data, req.user.id);
    }

    @Get('history')
    async getHistory(@Query('accountId') accountId: string) {
        return this.subscriptionsService.getHistory(accountId);
    }

    // ============================================
    // RENEWALS
    // ============================================

    @Post(':id/renew')
    async renewSubscription(
        @Param('id') subscriptionId: string,
        @Body() data: { duration: number; price: number; balanceUsed: number; clientId?: string },
        @Request() req: any,
    ) {
        return this.renewalService.createRenewal({
            subscriptionId,
            duration: data.duration,
            price: data.price,
            balanceUsed: data.balanceUsed,
            createdBy: req.user.id,
            clientId: data.clientId,
        });
    }

    @Get(':id/renewals')
    async getRenewalHistory(@Param('id') subscriptionId: string) {
        return this.renewalService.getRenewalHistory(subscriptionId);
    }

    @Get('customers/:customerId/renewals')
    async getCustomerRenewals(@Param('customerId') customerId: string) {
        return this.renewalService.getCustomerRenewals(customerId);
    }

    // ============================================
    // ALERTS
    // ============================================

    @Get('accounts/:accountId/alerts')
    async getActiveAlerts(@Param('accountId') accountId: string) {
        return this.balanceService.getActiveAlerts(accountId);
    }

    @Patch('alerts/:alertId/resolve')
    async resolveAlert(@Param('alertId') alertId: string, @Request() req: any) {
        return this.balanceService.resolveAlert(alertId, req.user.id);
    }

    @Post('accounts/:accountId/check-alerts')
    async checkAlerts(
        @Param('accountId') accountId: string,
        @Body() data: { threshold?: number },
    ) {
        return this.balanceService.checkAndGenerateAlerts(accountId, data.threshold);
    }

    // ============================================
    // PRICING CALCULATION
    // ============================================

    @Post('calculate-price')
    async calculatePrice(@Body() data: {
        offerBasePrice: number;
        offerPricingRules?: any;
        options: Array<{ basePrice: number; pricingRules?: any }>;
        context: {
            offerPrice: number;
            offerId: string;
            storeId?: string;
            duration?: number;
        };
    }) {
        return this.pricingEngine.calculateSubscriptionPrice(
            data.offerBasePrice,
            data.offerPricingRules,
            data.options,
            data.context,
        );
    }
}
