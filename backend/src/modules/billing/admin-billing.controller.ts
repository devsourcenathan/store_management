import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';
import {
    CreatePlanDto,
    UpdatePlanDto,
    AdminAssignSubscriptionDto,
    AdminUpdateSubscriptionDto,
} from './dto';

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GLOBAL_ADMIN)
export class AdminBillingController {
    constructor(private billingService: BillingService) { }

    // ============================================
    // PLAN MANAGEMENT
    // ============================================

    @Get('plans')
    async getAllPlans(@Query('includeInactive') includeInactive: string) {
        return this.billingService.getAllPlans(includeInactive === 'true');
    }

    @Get('plans/:id')
    async getPlan(@Param('id') id: string) {
        return this.billingService.getPlanById(id);
    }

    @Post('plans')
    async createPlan(@Body() data: CreatePlanDto) {
        return this.billingService.createPlan(data);
    }

    @Patch('plans/:id')
    async updatePlan(@Param('id') id: string, @Body() data: UpdatePlanDto) {
        return this.billingService.updatePlan(id, data);
    }

    @Delete('plans/:id')
    async deletePlan(@Param('id') id: string) {
        return this.billingService.deletePlan(id);
    }

    // ============================================
    // SUBSCRIPTION MANAGEMENT
    // ============================================

    @Get('subscriptions')
    async getAllSubscriptions() {
        return this.billingService.getAllSubscriptions();
    }

    @Post('subscriptions/assign')
    async assignSubscription(
        @Body() data: AdminAssignSubscriptionDto,
        @Request() req: any,
    ) {
        return this.billingService.adminAssignSubscription(data, req.user.sub);
    }

    @Patch('subscriptions/:id')
    async updateSubscription(
        @Param('id') id: string,
        @Body() data: AdminUpdateSubscriptionDto,
        @Request() req: any,
    ) {
        return this.billingService.adminUpdateSubscription(id, data, req.user.sub);
    }

    @Delete('subscriptions/:id')
    async cancelSubscription(@Param('id') id: string) {
        return this.billingService.adminCancelSubscription(id);
    }
}
