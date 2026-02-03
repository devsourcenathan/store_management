import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Headers,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { NotchPayService } from './notchpay.service';
import {
    CreatePlanDto,
    UpdatePlanDto,
    SubscribeDto,
    AdminAssignSubscriptionDto,
    AdminUpdateSubscriptionDto,
} from './dto';

@Controller('billing')
export class BillingController {
    constructor(
        private billingService: BillingService,
        private notchPayService: NotchPayService,
    ) { }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    @Get('plans')
    async getPlans() {
        return this.billingService.getAllPlans(false);
    }

    @Get('config')
    async getConfig() {
        return {
            publicKey: this.notchPayService.getPublicKey(),
        };
    }

    // ============================================
    // AUTHENTICATED USER ENDPOINTS
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Get('subscription')
    async getMySubscription(@Request() req: any) {
        return this.billingService.getOrganizationSubscription(req.user.organizationId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('subscribe')
    async subscribe(
        @Request() req: any,
        @Body() data: SubscribeDto,
        @Query('callback') callbackUrl: string,
    ) {
        const callback = callbackUrl || `${process.env.FRONTEND_URL}/billing/callback`;
        return this.billingService.initializeSubscription(
            req.user.organizationId,
            data,
            req.user.email,
            callback,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('invoices')
    async getMyInvoices(@Request() req: any) {
        return this.billingService.getOrganizationInvoices(req.user.organizationId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('invoices/:id')
    async getInvoice(@Param('id') id: string) {
        return this.billingService.getInvoiceById(id);
    }

    // ============================================
    // PAYMENT CALLBACK / WEBHOOK
    // ============================================

    @Get('callback')
    async handleCallback(@Query('reference') reference: string) {
        return this.billingService.handlePaymentCallback(reference);
    }

    @Post('webhook')
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-notchpay-signature') signature: string,
        @Body() body: any,
    ) {
        // Validate webhook signature
        const rawBody = req.rawBody?.toString() || JSON.stringify(body);
        const isValid = this.notchPayService.validateWebhookSignature(rawBody, signature);

        if (!isValid) {
            return { status: 'invalid_signature' };
        }

        // Handle different event types
        if (body.event === 'payment.complete') {
            await this.billingService.handlePaymentCallback(body.data.reference);
        }

        return { status: 'received' };
    }
}
