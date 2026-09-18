import { Module } from '@nestjs/common';
import { CashAdjustmentsService } from './cash-adjustments.service';
import { CashAdjustmentsController } from './cash-adjustments.controller';

@Module({
  controllers: [CashAdjustmentsController],
  providers: [CashAdjustmentsService],
  exports: [CashAdjustmentsService],
})
export class CashAdjustmentsModule {}
