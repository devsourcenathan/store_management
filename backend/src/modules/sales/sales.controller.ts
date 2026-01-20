import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { StoreAuthGuard } from '@/common/guards/store-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(private salesService: SalesService) { }

    @Get()
    @UseGuards(StoreAuthGuard)
    async findAll(@Query('storeId') storeId: string, @Query('customerId') customerId?: string) {
        return this.salesService.findAll(storeId, customerId);
    }

    @Post()
    @UseGuards(StoreAuthGuard)
    async create(@Body() data: any, @CurrentUser() user: any) {
        return this.salesService.create(data, user.id);
    }

    @Post(':id/payments')
    @UseGuards(StoreAuthGuard)
    async addPayment(@Body() data: any, @CurrentUser() user: any, @Param('id') id: string) {
        return this.salesService.addPayment(id, data, user.id);
    }

    @Patch(':id')
    @UseGuards(StoreAuthGuard)
    async update(@Body() data: any, @Param('id') id: string) {
        return this.salesService.update(id, data);
    }
}
