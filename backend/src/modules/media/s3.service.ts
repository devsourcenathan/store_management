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
            region: this.configService.get('AWS_REGION'),
            credentials: {
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
            },
        });
        this.bucket = this.configService.get('AWS_S3_BUCKET');
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
            const url = `https://${this.bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

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
            return urlObj.pathname.substring(1); // Remove leading slash
        } catch (error) {
            this.logger.error(`Invalid URL format: ${url}`);
            throw new Error('Invalid S3 URL format');
        }
    }
}
