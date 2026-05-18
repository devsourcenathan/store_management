import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaEntityType } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalStorageService {
    private readonly logger = new Logger(LocalStorageService.name);
    private readonly baseDir: string;

    constructor(private configService: ConfigService) {
        this.baseDir = this.configService.get<string>('LOCAL_MEDIA_DIR') || '';
    }

    getFilePath(organizationId: string, entityType: MediaEntityType, filename: string) {
        if (!this.baseDir) {
            throw new Error('LOCAL_MEDIA_DIR is not configured');
        }
        const safeOrg = organizationId || 'unknown-org';
        const safeEntity = String(entityType || 'OTHER').toLowerCase();
        return path.join(this.baseDir, safeOrg, safeEntity, filename);
    }

    async save(organizationId: string, entityType: MediaEntityType, filename: string, buffer: Buffer) {
        const filepath = this.getFilePath(organizationId, entityType, filename);
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        await fs.writeFile(filepath, buffer);
        this.logger.log(`Saved local media: ${filepath}`);
        return filepath;
    }

    async delete(organizationId: string, entityType: MediaEntityType, filename: string) {
        const filepath = this.getFilePath(organizationId, entityType, filename);
        try {
            await fs.unlink(filepath);
            this.logger.log(`Deleted local media: ${filepath}`);
        } catch (error: any) {
            if (error?.code === 'ENOENT') return;
            throw error;
        }
    }
}
