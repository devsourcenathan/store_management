import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    getDashboardStats(
        @Query('storeId') storeId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.analyticsService.getDashboardStats(storeId, startDate, endDate);
    }

    @Get('sales-trend')
    getSalesTrend(
        @Query('storeId') storeId: string,
        @Query('days') days?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.analyticsService.getSalesTrend(storeId, days ? parseInt(days) : 7, startDate, endDate);
    }

    @Get('top-products')
    getTopProducts(
        @Query('storeId') storeId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.analyticsService.getTopProducts(storeId, startDate, endDate);
    }
}
