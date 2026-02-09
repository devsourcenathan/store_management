import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { BillingController } from './billing.controller';
import { AdminBillingController } from './admin-billing.controller';
import { BillingService } from './billing.service';
import { NotchPayService } from './notchpay.service';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [BillingController, AdminBillingController],
    providers: [BillingService, NotchPayService],
    exports: [BillingService, NotchPayService],
})
export class BillingModule { }
