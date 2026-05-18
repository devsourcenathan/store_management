import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';
import { MediaEntityType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
    constructor(
        private prisma: PrismaService,
        private s3Service: S3Service,
        private localStorageService: LocalStorageService,
        private configService: ConfigService,
    ) { }

    async uploadMedia(
        file: Express.Multer.File,
        organizationId: string,
        entityType: MediaEntityType,
        entityId: string,
        userId: string,
        metadata?: { alt?: string; tags?: string[]; isPublic?: boolean },
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        // Validate file type (images only for now)
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Only image files are allowed');
        }

        const storageMode = (this.configService.get<string>('MEDIA_STORAGE') || 's3').toLowerCase();
        const id = uuidv4();
        const safeOriginal = (file.originalname || 'file')
            .replaceAll('\\', '_')
            .replaceAll('/', '_')
            .replaceAll(':', '_')
            .replaceAll('..', '_');
        const filename = `${id}-${Date.now()}-${safeOriginal}`;

        let url: string;
        if (storageMode === 'local') {
            await this.localStorageService.save(organizationId, entityType, filename, file.buffer);
            // Global prefix is "api" in this app
            url = `/api/media/files/${id}`;
        } else {
            url = await this.s3Service.uploadFile(
                file,
                `${organizationId}/${entityType.toLowerCase()}`,
            );
        }

        // Create database record
        return this.prisma.media.create({
            data: {
                id,
                filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url,
                entityType,
                entityId,
                organizationId,
                uploadedBy: userId,
                alt: metadata?.alt,
                tags: metadata?.tags || [],
                isPublic: metadata?.isPublic || false,
            },
        });
    }

    async findAll(organizationId: string, filters?: {
        entityType?: MediaEntityType;
        entityId?: string;
        tags?: string[];
    }) {
        const databaseUrl = this.configService.get<string>('DATABASE_URL') || '';
        const isSqlite = databaseUrl.startsWith('file:') || (this.configService.get<string>('DB_PROVIDER') || '').toLowerCase() === 'sqlite';

        const results = await this.prisma.media.findMany({
            where: {
                organizationId,
                ...(filters?.entityType && { entityType: filters.entityType }),
                ...(filters?.entityId && { entityId: filters.entityId }),
                ...(filters?.tags && filters.tags.length > 0 && !isSqlite && {
                    tags: { hasSome: filters.tags },
                }),
            },
            orderBy: { createdAt: 'desc' },
        });

        if (filters?.tags && filters.tags.length > 0 && isSqlite) {
            const wanted = new Set(filters.tags.map(t => t.trim()).filter(Boolean));
            return results.filter((m: any) => {
                const raw = (m as any).tags;
                const tags = Array.isArray(raw)
                    ? raw
                    : String(raw || '')
                        .split(',')
                        .map((t: string) => t.trim())
                        .filter(Boolean);
                return tags.some((t: string) => wanted.has(t));
            });
        }

        return results;
    }

    async findOne(id: string, organizationId: string) {
        const media = await this.prisma.media.findFirst({
            where: { id, organizationId },
        });

        if (!media) {
            throw new NotFoundException('Media not found');
        }

        return media;
    }

    async delete(id: string, organizationId: string) {
        const media = await this.findOne(id, organizationId);

        const storageMode = (this.configService.get<string>('MEDIA_STORAGE') || 's3').toLowerCase();
        if (storageMode === 'local') {
            await this.localStorageService.delete(media.organizationId, media.entityType, media.filename);
        } else {
            // Delete from S3
            try {
                await this.s3Service.deleteFile(media.url);
            } catch (error) {
                // Log error but continue with database deletion
                console.error('Failed to delete from S3:', error);
            }
        }

        // Delete from database
        return this.prisma.media.delete({
            where: { id },
        });
    }

    async updateMetadata(
        id: string,
        organizationId: string,
        metadata: { alt?: string; tags?: string[] },
    ) {
        await this.findOne(id, organizationId);

        return this.prisma.media.update({
            where: { id },
            data: metadata,
        });
    }

    async linkToEntity(
        mediaId: string,
        entityType: MediaEntityType,
        entityId: string,
        organizationId: string,
    ) {
        await this.findOne(mediaId, organizationId);

        return this.prisma.media.update({
            where: { id: mediaId },
            data: { entityType, entityId },
        });
    }

    async findByEntity(
        entityType: MediaEntityType,
        entityId: string,
        organizationId: string,
    ) {
        return this.prisma.media.findMany({
            where: {
                organizationId,
                entityType,
                entityId,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
