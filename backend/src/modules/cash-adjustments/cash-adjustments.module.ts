import { Module } from '@nestjs/common';
import { CashAdjustmentsService } from './cash-adjustments.service';
import { CashAdjustmentsController } from './cash-adjustments.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [CashAdjustmentsController],
    providers: [CashAdjustmentsService],
    exports: [CashAdjustmentsService],
})
export class CashAdjustmentsModule {}
