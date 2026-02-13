import { Controller, Get, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { UserAnalyticsService } from './user-analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUserDashboardDto, GetUserStatsDto, GetUserRankingsDto } from './dto/user-analytics.dto';
import { Response } from 'express';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly userAnalyticsService: UserAnalyticsService
    ) { }

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

    @Get('owner/aggregated')
    getOwnerAggregatedStats(
        @Query('organizationId') organizationId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.analyticsService.getOwnerAggregatedStats(organizationId, startDate, endDate);
    }

    @Get('owner/by-store')
    getOwnerStatsByStore(
        @Query('organizationId') organizationId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.analyticsService.getOwnerStatsByStore(organizationId, startDate, endDate);
    }

    @Get('owner/comparison')
    getStoreComparison(
        @Query('organizationId') organizationId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.analyticsService.getStoreComparison(organizationId, startDate, endDate);
    }

    // ============================================
    // USER ANALYTICS ENDPOINTS (OWNER/MANAGER ONLY)
    // ============================================

    /**
     * Get user analytics dashboard
     */
    @Get('users/dashboard')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getUserDashboard(@Query() query: GetUserDashboardDto, @Req() req) {
        const organizationId = req.user.organizationId;

        return this.userAnalyticsService.getUserDashboard({
            organizationId,
            userId: query.userId,
            storeId: query.storeId,
            period: query.period,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined
        });
    }

    /**
     * Get sales statistics by user
     */
    @Get('users/sales')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getUserSalesStats(@Query() query: GetUserStatsDto, @Req() req) {
        const organizationId = req.user.organizationId;

        return this.userAnalyticsService.getUserSalesStats({
            organizationId,
            userId: query.userId,
            storeId: query.storeId,
            startDate: new Date(query.startDate),
            endDate: new Date(query.endDate)
        });
    }

    /**
     * Get maintenance statistics by user
     */
    @Get('users/maintenances')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getUserMaintenanceStats(@Query() query: GetUserStatsDto, @Req() req) {
        const organizationId = req.user.organizationId;

        return this.userAnalyticsService.getUserMaintenanceStats({
            organizationId,
            userId: query.userId,
            storeId: query.storeId,
            startDate: new Date(query.startDate),
            endDate: new Date(query.endDate)
        });
    }

    /**
     * Get subscription statistics by user
     */
    @Get('users/subscriptions')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getUserSubscriptionStats(@Query() query: GetUserStatsDto, @Req() req) {
        const organizationId = req.user.organizationId;

        return this.userAnalyticsService.getUserSubscriptionStats({
            organizationId,
            userId: query.userId,
            storeId: query.storeId,
            startDate: new Date(query.startDate),
            endDate: new Date(query.endDate)
        });
    }

    /**
     * Get user rankings
     */
    @Get('users/rankings')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async getUserRankings(@Query() query: GetUserRankingsDto, @Req() req) {
        const organizationId = req.user.organizationId;
        console.log('GetUserRankings Query:', query);
        console.log('GetUserRankings Metric:', query.metric);

        // Calculate date range based on period or use provided dates
        let startDate: Date;
        let endDate: Date;

        if (query.period) {
            // Use period to calculate dates
            const dateRange = this.calculateDateRange(query.period,
                query.startDate ? new Date(query.startDate) : undefined,
                query.endDate ? new Date(query.endDate) : undefined
            );
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        } else if (query.startDate && query.endDate) {
            // Use provided dates
            startDate = new Date(query.startDate);
            endDate = new Date(query.endDate);
        } else {
            // Default to current month
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        return this.userAnalyticsService.getUserRankings({
            organizationId,
            storeId: query.storeId,
            metric: query.metric,
            startDate,
            endDate,
            limit: query.limit
        });
    }

    /**
     * Helper method to calculate date range based on period
     */
    private calculateDateRange(period: string, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
        const now = new Date();

        switch (period) {
            case 'day':
                return {
                    startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
                    endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
                };
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                return { startDate: weekStart, endDate: weekEnd };
            case 'month':
                return {
                    startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
                    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                };
            case 'quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const startMonth = currentQuarter * 3;
                return {
                    startDate: new Date(now.getFullYear(), startMonth, 1, 0, 0, 0, 0),
                    endDate: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999)
                };
            case 'year':
                return {
                    startDate: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
                    endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
                };
            case 'custom':
                if (!customStart || !customEnd) {
                    // Return default (month) if dates are missing for custom period
                    return {
                        startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
                        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                    };
                }
                return { startDate: customStart, endDate: customEnd };
            default:
                return {
                    startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
                    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                };
        }
    }

    /**
     * Export user analytics as CSV
     */
    @Get('users/export')
    @Roles(UserRole.OWNER, UserRole.MANAGER)
    async exportUserAnalytics(
        @Query() query: GetUserStatsDto,
        @Req() req,
        @Res() res: Response
    ) {
        const organizationId = req.user.organizationId;

        const [sales, maintenances, subscriptions] = await Promise.all([
            this.userAnalyticsService.getUserSalesStats({
                organizationId,
                userId: query.userId,
                storeId: query.storeId,
                startDate: new Date(query.startDate),
                endDate: new Date(query.endDate)
            }),
            this.userAnalyticsService.getUserMaintenanceStats({
                organizationId,
                userId: query.userId,
                storeId: query.storeId,
                startDate: new Date(query.startDate),
                endDate: new Date(query.endDate)
            }),
            this.userAnalyticsService.getUserSubscriptionStats({
                organizationId,
                userId: query.userId,
                storeId: query.storeId,
                startDate: new Date(query.startDate),
                endDate: new Date(query.endDate)
            })
        ]);

        // Convert to CSV
        const csvRows = [];
        csvRows.push([
            'User',
            'Email',
            'Role',
            'Sales Count',
            'Sales Amount',
            'Items Sold',
            'Avg Basket',
            'Maintenances Created',
            'Maintenances Completed',
            'Maintenance Revenue',
            'Completion Rate',
            'Subscriptions Created',
            'Renewals Processed',
            'Subscription Revenue'
        ].join(','));

        // Handle both single user and multiple users response
        const salesData = Array.isArray(sales) ? sales : [{ user: null, ...sales }];
        const maintenanceData = Array.isArray(maintenances) ? maintenances : [{ user: null, ...maintenances }];
        const subscriptionData = Array.isArray(subscriptions) ? subscriptions : [{ user: null, ...subscriptions }];

        salesData.forEach((saleStats, index) => {
            const maintenanceStats: any = maintenanceData[index] || {};
            const subscriptionStats: any = subscriptionData[index] || {};

            csvRows.push([
                saleStats.user?.name || 'N/A',
                saleStats.user?.email || 'N/A',
                saleStats.user?.role || 'N/A',
                saleStats.salesCount || 0,
                saleStats.totalAmount || 0,
                saleStats.itemsSold || 0,
                saleStats.averageBasket || 0,
                maintenanceStats.created || 0,
                maintenanceStats.completed || 0,
                maintenanceStats.revenue || 0,
                maintenanceStats.completionRate || 0,
                subscriptionStats.subscriptionsCreated || 0,
                subscriptionStats.renewalsProcessed || 0,
                subscriptionStats.revenue || 0
            ].join(','));
        });

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=user-analytics-${Date.now()}.csv`);
        res.send(csv);
    }
}
