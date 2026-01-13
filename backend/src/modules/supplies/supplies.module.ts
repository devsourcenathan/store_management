import { Module } from '@nestjs/common';
import { SuppliesController } from './supplies.controller';
import { SuppliesService } from './supplies.service';
import { StockModule } from '../stock/stock.module';

@Module({
    imports: [StockModule],
    controllers: [SuppliesController],
    providers: [SuppliesService],
})
export class SuppliesModule { }
