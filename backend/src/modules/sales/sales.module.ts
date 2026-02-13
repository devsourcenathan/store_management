import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { StockModule } from '../stock/stock.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [StockModule, AuditModule],
    controllers: [SalesController],
    providers: [SalesService],
    exports: [SalesService],
})
export class SalesModule { }
