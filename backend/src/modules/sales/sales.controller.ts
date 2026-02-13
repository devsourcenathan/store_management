import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { StoreAuthGuard } from '@/common/guards/store-auth.guard';
import { CurrentUser, CurrentOrganization } from '@/common/decorators/user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(
        private salesService: SalesService,
        private auditService: AuditService,
    ) { }

    @Get()
    @UseGuards(StoreAuthGuard)
    async findAll(@Query('storeId') storeId: string, @Query('customerId') customerId?: string) {
        return this.salesService.findAll(storeId, customerId);
    }

    @Post()
    @UseGuards(StoreAuthGuard)
    async create(@Body() data: any, @CurrentUser() user: any, @CurrentOrganization() organizationId: string) {
        const sale = await this.salesService.create(data, user.id);

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'CREATE',
            entity: 'Sale',
            entityId: sale.id,
            changes: { totalAmount: sale.totalAmount, items: data.items?.length || 0 },
        });

        return sale;
    }

    @Post(':id/payments')
    @UseGuards(StoreAuthGuard)
    async addPayment(@Body() data: any, @CurrentUser() user: any, @Param('id') id: string, @CurrentOrganization() organizationId: string) {
        const payment = await this.salesService.addPayment(id, data, user.id);

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'ADD_PAYMENT',
            entity: 'Sale',
            entityId: id,
            changes: { amount: data.amount, method: data.method },
        });

        return payment;
    }

    @Patch(':id')
    @UseGuards(StoreAuthGuard)
    async update(@Body() data: any, @Param('id') id: string, @CurrentUser() user: any, @CurrentOrganization() organizationId: string) {
        const sale = await this.salesService.update(id, data);

        await this.auditService.log({
            organizationId,
            userId: user.id,
            action: 'UPDATE',
            entity: 'Sale',
            entityId: id,
            changes: data,
        });

        return sale;
    }
}
