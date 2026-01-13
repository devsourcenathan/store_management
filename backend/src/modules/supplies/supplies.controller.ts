import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { SuppliesService } from './supplies.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentOrganization, CurrentUser } from '@/common/decorators/user.decorator';

@Controller('supplies')
@UseGuards(JwtAuthGuard)
export class SuppliesController {
    constructor(private suppliesService: SuppliesService) { }

    @Get()
    async findAll(@CurrentOrganization() organizationId: string) {
        return this.suppliesService.findAll(organizationId);
    }

    @Post()
    async create(
        @Body() data: any,
        @CurrentUser() user: any
    ) {
        return this.suppliesService.create(data, user.id);
    }

    @Post(':id/receive')
    async receive(
        @Param('id') id: string,
        @Body('storeId') storeId: string,
        @Body('items') items: { productId: string, quantity: number }[],
        @CurrentUser() user: any
    ) {
        return this.suppliesService.receive(id, storeId, user.id, items);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.suppliesService.delete(id);
    }
}
