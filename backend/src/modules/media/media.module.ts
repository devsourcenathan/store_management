import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { LocalStorageService } from './local-storage.service';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [MediaController],
    providers: [MediaService, S3Service, LocalStorageService],
    exports: [MediaService, S3Service, LocalStorageService],
})
export class MediaModule { }
