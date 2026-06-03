import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncGenericService } from './sync-generic.service';
import { DesktopSyncService } from './desktop-sync.service';
import { DesktopConfigController } from './desktop-config.controller';


import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SyncController, DesktopConfigController],
    providers: [SyncGenericService, DesktopSyncService],
})
export class SyncModule { }
