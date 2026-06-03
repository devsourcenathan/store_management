import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly logger = new Logger(S3Service.name);

    constructor(private configService: ConfigService) {
        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${this.configService.get('CLOUDFLARE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: this.configService.get('CLOUDFLARE_R2_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
            },
        });
        this.bucket = this.configService.get('CLOUDFLARE_R2_BUCKET_NAME');
    }

    async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
        const key = `${path}/${Date.now()}-${file.originalname}`;

        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await this.s3Client.send(command);

            const publicUrl = this.configService.get('CLOUDFLARE_R2_PUBLIC_URL');
            let url: string;
            
            if (publicUrl) {
                const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
                url = `${cleanPublicUrl}/${key}`;
            } else {
                url = `https://${this.configService.get('CLOUDFLARE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${this.bucket}/${key}`;
            }

            this.logger.log(`File uploaded successfully: ${key}`);
            return url;
        } catch (error) {
            this.logger.error(`Failed to upload file: ${error.message}`);
            throw error;
        }
    }

    async deleteFile(url: string): Promise<void> {
        try {
            const key = this.extractKeyFromUrl(url);

            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.s3Client.send(command);
            this.logger.log(`File deleted successfully: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to delete file: ${error.message}`);
            throw error;
        }
    }

    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            return await getSignedUrl(this.s3Client, command, { expiresIn });
        } catch (error) {
            this.logger.error(`Failed to generate signed URL: ${error.message}`);
            throw error;
        }
    }

    private extractKeyFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            let key = urlObj.pathname.substring(1); // Remove leading slash
            
            if (!this.configService.get('CLOUDFLARE_R2_PUBLIC_URL') && key.startsWith(`${this.bucket}/`)) {
                key = key.substring(this.bucket.length + 1);
            }
            
            return decodeURIComponent(key);
        } catch (error) {
            this.logger.error(`Invalid URL format: ${url}`);
            throw new Error('Invalid R2 URL format');
        }
    }
}
