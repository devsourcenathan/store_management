import { Controller, Post, Body, Param, Get, Query, Patch } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@prisma/client';

@Controller('credits')
export class CreditController {
    constructor(private readonly creditService: CreditService) { }

    @Post()
    create(@Body() createCreditDto: any, @CurrentUser() user: User) {
        return this.creditService.create(createCreditDto, user.id);
    }

    @Post(':id/payments')
    addPayment(
        @Param('id') id: string,
        @Body() paymentDto: any,
        @CurrentUser() user: User,
    ) {
        return this.creditService.addPayment(id, paymentDto, user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.creditService.findOne(id);
    }

    @Get('sale/:saleId')
    findBySale(@Param('saleId') saleId: string) {
        return this.creditService.findBySale(saleId);
    }

    @Get()
    findAll(@Query('storeId') storeId: string, @Query('status') status?: string) {
        return this.creditService.findAll(storeId, status);
    }
}
