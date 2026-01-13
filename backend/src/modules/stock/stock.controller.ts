import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { StockService } from './stock.service';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreAuthGuard } from '@/common/guards/store-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { UserRole } from '@prisma/client';

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
    constructor(
        private stockService: StockService,
        private transfersService: TransfersService
    ) { }

    @Get('movements')
    @UseGuards(StoreAuthGuard)
    async getMovements(
        @Query('storeId') storeId: string,
        @Query('productId') productId?: string,
    ) {
        return this.stockService.getMovements(storeId, productId);
    }

    @Post('movements')
    @UseGuards(RolesGuard, StoreAuthGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
    async createMovement(@Body() data: any, @CurrentUser() user: any) {
        return this.stockService.createMovement(data, user.id);
    }

    @Get('current')
    @UseGuards(StoreAuthGuard)
    async getCurrentStock(
        @Query('productId') productId: string,
        @Query('storeId') storeId: string,
    ) {
        return this.stockService.getCurrentStock(productId, storeId);
    }

    @Get('store/:storeId')
    @UseGuards(StoreAuthGuard)
    async getAllStockInStore(@Param('storeId') storeId: string) {
        return this.stockService.getAllStockInStore(storeId);
    }

    @Get('history')
    @UseGuards(StoreAuthGuard)
    async getStockHistory(
        @Query('productId') productId: string,
        @Query('storeId') storeId: string,
    ) {
        return this.stockService.getStockHistory(productId, storeId);
    }

    @Get('alerts/:storeId')
    @UseGuards(StoreAuthGuard)
    async getLowStockAlerts(@Param('storeId') storeId: string) {
        return this.stockService.getLowStockAlerts(storeId);
    }

    @Patch('alerts/:alertId/acknowledge')
    async acknowledgeAlert(
        @Param('alertId') alertId: string,
        @CurrentUser() user: any,
    ) {
        return this.stockService.acknowledgeAlert(alertId, user.id);
    }

    @Post('alerts/scan')
    @UseGuards(RolesGuard, StoreAuthGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async scanStockAlerts(@Body() data: { storeId: string }) {
        return this.stockService.scanStockAlerts(data.storeId);
    }

    @Post('transfer')
    @UseGuards(RolesGuard)
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async createTransfer(@Body() data: any, @CurrentUser() user: any) {
        return this.transfersService.createTransfer({
            ...data,
            createdBy: user.id
        });
    }

    @Get('transfers')
    async getTransferHistory(@Request() req: any) {
        return this.transfersService.getTransferHistory(req.user.organizationId);
    }
}
