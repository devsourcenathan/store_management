import { Module } from '@nestjs/common';
import { StockCalculationService } from './stock-calculation.service';
import { StockService } from './stock.service';
import { TransfersService } from './transfers.service';
import { StockController } from './stock.controller';

@Module({
    controllers: [StockController],
    providers: [StockCalculationService, StockService, TransfersService],
    exports: [StockCalculationService, StockService, TransfersService],
})
export class StockModule { }
