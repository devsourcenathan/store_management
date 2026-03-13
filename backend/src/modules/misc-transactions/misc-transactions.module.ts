import { Module } from '@nestjs/common';
import { MiscTransactionsService } from './misc-transactions.service';
import { MiscTransactionsController } from './misc-transactions.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [MiscTransactionsController],
    providers: [MiscTransactionsService],
    exports: [MiscTransactionsService],
})
export class MiscTransactionsModule {}
