import { Module } from '@nestjs/common';
import { PricingEngineService } from './pricing-engine.service';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';

@Module({
    controllers: [ProductsController, CategoriesController],
    providers: [PricingEngineService, ProductsService],
    exports: [PricingEngineService, ProductsService],
})
export class ProductsModule { }
