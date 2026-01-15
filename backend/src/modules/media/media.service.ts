import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { S3Service } from './s3.service';
import { MediaEntityType } from '@prisma/client';

@Injectable()
export class MediaService {
    constructor(
        private prisma: PrismaService,
        private s3Service: S3Service,
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

        // Upload to S3
        const url = await this.s3Service.uploadFile(
            file,
            `${organizationId}/${entityType.toLowerCase()}`,
        );

        // Create database record
        return this.prisma.media.create({
            data: {
                filename: `${Date.now()}-${file.originalname}`,
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
        return this.prisma.media.findMany({
            where: {
                organizationId,
                ...(filters?.entityType && { entityType: filters.entityType }),
                ...(filters?.entityId && { entityId: filters.entityId }),
                ...(filters?.tags && filters.tags.length > 0 && {
                    tags: { hasSome: filters.tags }
                }),
            },
            orderBy: { createdAt: 'desc' },
        });
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

        // Delete from S3
        try {
            await this.s3Service.deleteFile(media.url);
        } catch (error) {
            // Log error but continue with database deletion
            console.error('Failed to delete from S3:', error);
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
