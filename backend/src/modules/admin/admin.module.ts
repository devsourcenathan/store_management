import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DangerZoneController } from './danger-zone.controller';
import { DangerZoneService } from './danger-zone.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AdminController, DangerZoneController],
    providers: [AdminService, DangerZoneService],
    exports: [DangerZoneService],
})
export class AdminModule { }
