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

    // Server-side pagination + filters for the sales history page.
    // status is restricted to real SaleStatus values; unknown values ignored.
    private static readonly SALE_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'];

    @Get()
    @UseGuards(StoreAuthGuard)
    async findAll(
        @Query('storeId') storeId: string,
        @CurrentUser() user: any,
        @Query('customerId') customerId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
    ) {
        return this.salesService.findAll(
            storeId,
            user,
            customerId,
            page ? parseInt(page, 10) : undefined,
            limit ? parseInt(limit, 10) : undefined,
            {
                ...(status && SalesController.SALE_STATUSES.includes(status) ? { status } : {}),
                ...(startDate ? { startDate } : {}),
                ...(endDate ? { endDate } : {}),
                ...(search ? { search } : {}),
            },
        );
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
