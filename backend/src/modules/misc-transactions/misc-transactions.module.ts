import { Module } from '@nestjs/common';
import { MiscTransactionsService } from './misc-transactions.service';
import { MiscTransactionsController } from './misc-transactions.controller';

@Module({
  controllers: [MiscTransactionsController],
  providers: [MiscTransactionsService],
  exports: [MiscTransactionsService],
})
export class MiscTransactionsModule {}
