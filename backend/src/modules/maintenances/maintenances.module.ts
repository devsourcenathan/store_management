import { Module } from '@nestjs/common';
import { MaintenancesService } from './maintenances.service';
import { MaintenancesController } from './maintenances.controller';

@Module({
    controllers: [MaintenancesController],
    providers: [MaintenancesService],
    exports: [MaintenancesService],
})
export class MaintenancesModule { }
