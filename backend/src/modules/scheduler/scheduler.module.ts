import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { MailModule } from '../mail/mail.module';
import { ReportsModule } from '../reports/reports.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Module({
    imports: [
        NestScheduleModule.forRoot(),
        MailModule,
        ReportsModule,
        PrismaModule,
    ],
    controllers: [SchedulerController],
    providers: [SchedulerService],
})
export class SchedulerModule { }
