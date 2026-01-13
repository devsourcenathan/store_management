import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(private salesService: SalesService) { }

    @Get()
    async findAll(@Query('storeId') storeId: string) {
        return this.salesService.findAll(storeId);
    }

    @Post()
    async create(@Body() data: any, @CurrentUser() user: any) {
        return this.salesService.create(data, user.id);
    }
}
