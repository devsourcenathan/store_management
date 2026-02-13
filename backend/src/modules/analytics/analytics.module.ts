import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { UserAnalyticsService } from './user-analytics.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService, UserAnalyticsService],
})
export class AnalyticsModule { }
