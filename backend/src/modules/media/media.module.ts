import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [MediaController],
    providers: [MediaService, S3Service],
    exports: [MediaService, S3Service],
})
export class MediaModule { }
