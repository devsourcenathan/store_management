import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { StoreAuthGuard } from '@/common/guards/store-auth.guard';
import { CurrentOrganization, CurrentUser } from '@/common/decorators/user.decorator';
import { MediaEntityType } from '@prisma/client';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';

@Controller('media')
@UseGuards(JwtAuthGuard, StoreAuthGuard)
export class MediaController {
    constructor(
        private mediaService: MediaService,
        private configService: ConfigService,
        private localStorageService: LocalStorageService,
    ) { }

    @Get('files/:id')
    async getLocalFile(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
        @Res() res: Response,
    ) {
        const storageMode = (this.configService.get<string>('MEDIA_STORAGE') || 's3').toLowerCase();
        if (storageMode !== 'local') {
            return res.status(404).send('Not found');
        }

        const media = await this.mediaService.findOne(id, organizationId);
        const filepath = this.localStorageService.getFilePath(media.organizationId, media.entityType, media.filename);

        res.setHeader('Content-Type', media.mimeType || 'application/octet-stream');
        res.setHeader('Content-Length', String(media.size || 0));
        res.setHeader('Cache-Control', 'private, max-age=3600');

        return createReadStream(filepath).pipe(res);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body('entityType') entityType: MediaEntityType,
        @Body('entityId') entityId: string,
        @Body('alt') alt?: string,
        @Body('tags') tags?: string,
        @Body('isPublic') isPublic?: string,
        @CurrentOrganization() organizationId?: string,
        @CurrentUser() user?: any,
    ) {
        return this.mediaService.uploadMedia(
            file,
            organizationId,
            entityType,
            entityId,
            user?.id,
            {
                alt,
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                isPublic: isPublic === 'true',
            },
        );
    }

    @Get()
    async findAll(
        @CurrentOrganization() organizationId: string,
        @Query('entityType') entityType?: MediaEntityType,
        @Query('entityId') entityId?: string,
        @Query('tags') tags?: string,
    ) {
        return this.mediaService.findAll(organizationId, {
            entityType,
            entityId,
            tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
        });
    }

    @Get('entity/:entityType/:entityId')
    async findByEntity(
        @Param('entityType') entityType: MediaEntityType,
        @Param('entityId') entityId: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.mediaService.findByEntity(entityType, entityId, organizationId);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.mediaService.findOne(id, organizationId);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.mediaService.delete(id, organizationId);
    }

    @Patch(':id')
    async updateMetadata(
        @Param('id') id: string,
        @Body() metadata: { alt?: string; tags?: string[] },
        @CurrentOrganization() organizationId: string,
    ) {
        return this.mediaService.updateMetadata(id, organizationId, metadata);
    }

    @Patch(':id/link')
    async linkToEntity(
        @Param('id') id: string,
        @Body('entityType') entityType: MediaEntityType,
        @Body('entityId') entityId: string,
        @CurrentOrganization() organizationId: string,
    ) {
        return this.mediaService.linkToEntity(id, entityType, entityId, organizationId);
    }
}
